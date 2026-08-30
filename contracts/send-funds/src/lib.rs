//! Send Funds — Soroban smart contract for Student Expense Wallet AI
//!
//! Models a parent -> student custodial escrow on Stellar testnet with advanced
//! features including disputes, refunds, and storage TTL management.
//!
//! Flow:
//!   1. A parent calls `deposit` to lock XLM into the contract for a student.
//!   2. The student calls `release` to pull funds, provided it is not disputed.
//!   3. A parent can `dispute` to freeze the funds, `resolve` to unfreeze,
//!      or `refund` to pull the remaining escrowed funds back.
//!   4. Anyone can call `get_balance` to check the current escrow state.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

const DAY_IN_LEDGERS: u32 = 17280; // Assuming ~5s per ledger
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowKey {
    pub parent: Address,
    pub student: Address,
    pub asset: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowValue {
    pub balance: i128,
    pub disputed: bool,
    pub is_paused: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// Amount must be a positive integer.
    InvalidAmount = 1,
    /// Release/Refund amount exceeds available balance.
    InsufficientBalance = 2,
    /// Arithmetic overflow while updating a balance.
    Overflow = 3,
    /// The escrow is currently under dispute.
    Disputed = 4,
    /// The escrow is currently paused by the parent.
    Paused = 5,
}

#[contract]
pub struct SendFunds;

#[contractimpl]
impl SendFunds {
    /// Parent deposits `amount` of `asset` into escrow for `student`.
    pub fn deposit(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        parent.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let client = token::Client::new(&env, &asset);
        client.transfer(&parent, &env.current_contract_address(), &amount);

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        current_val.balance = current_val
            .balance
            .checked_add(amount)
            .ok_or(ContractError::Overflow)?;

        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        env.events().publish(
            (symbol_short!("deposit"), parent, student),
            (asset, amount, current_val.balance),
        );

        Ok(current_val.balance)
    }

    /// Student pulls `amount` of previously escrowed `asset` out of the contract.
    pub fn release(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        student.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        if current_val.disputed {
            return Err(ContractError::Disputed);
        }

        if current_val.is_paused {
            return Err(ContractError::Paused);
        }

        if amount > current_val.balance {
            return Err(ContractError::InsufficientBalance);
        }

        current_val.balance -= amount;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        let client = token::Client::new(&env, &asset);
        client.transfer(&env.current_contract_address(), &student, &amount);

        env.events().publish(
            (symbol_short!("release"), parent, student),
            (asset, amount, current_val.balance),
        );

        Ok(current_val.balance)
    }

    /// Parent can refund `amount` back to their own wallet from the escrow.
    pub fn refund(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        parent.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        if amount > current_val.balance {
            return Err(ContractError::InsufficientBalance);
        }

        current_val.balance -= amount;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        let client = token::Client::new(&env, &asset);
        client.transfer(&env.current_contract_address(), &parent, &amount);

        env.events().publish(
            (symbol_short!("refund"), parent, student),
            (asset, amount, current_val.balance),
        );

        Ok(current_val.balance)
    }


    /// Parent pauses the escrow, freezing releases.
    pub fn pause(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
    ) -> Result<(), ContractError> {
        parent.require_auth();

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        current_val.is_paused = true;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("pause"), parent, student), (asset,));

        Ok(())
    }

    /// Parent unpauses the escrow, unfreezing releases.
    pub fn unpause(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
    ) -> Result<(), ContractError> {
        parent.require_auth();

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        current_val.is_paused = false;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("unpause"), parent, student), (asset,));

        Ok(())
    }

    /// Parent flags the escrow as disputed, freezing releases.
    pub fn dispute(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
    ) -> Result<(), ContractError> {
        parent.require_auth();

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        current_val.disputed = true;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("dispute"), parent, student), (asset,));

        Ok(())
    }

    /// Parent resolves a dispute, unfreezing releases.
    pub fn resolve(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), ContractError> {
        parent.require_auth();

        let key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        current_val.disputed = false;
        env.storage().persistent().set(&key, &current_val);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("resolve"), parent, student), (asset, reason));

        Ok(())
    }

    /// Read-only: available (un-released) escrow balance.
    pub fn get_balance(env: Env, parent: Address, student: Address, asset: Address) -> i128 {
        let key = EscrowKey {
            parent,
            student,
            asset,
        };
        let val: EscrowValue = env.storage().persistent().get(&key).unwrap_or(EscrowValue {
            balance: 0,
            disputed: false,
            is_paused: false,
        });
        val.balance
    }

    /// Read-only: check if escrow is disputed.
    pub fn is_disputed(env: Env, parent: Address, student: Address, asset: Address) -> bool {
        let key = EscrowKey {
            parent,
            student,
            asset,
        };
        let val: EscrowValue = env.storage().persistent().get(&key).unwrap_or(EscrowValue {
            balance: 0,
            disputed: false,
            is_paused: false,
        });
        val.disputed
    }
}

mod test;
