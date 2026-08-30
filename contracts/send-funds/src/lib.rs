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
pub struct SavingsKey {
    pub student: Address,
    pub asset: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LimitKey {
    pub tag: soroban_sdk::Symbol,
    pub parent: Address,
    pub student: Address,
    pub asset: Address,
}

/// Key used to store a tooltip string for a named UI field.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TooltipKey {
    pub field: soroban_sdk::String,
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
    /// The requested withdrawal amount exceeds the set limit.
    LimitExceeded = 6,
    /// The requested savings withdrawal exceeds the savings balance.
    SavingsInsufficient = 7,
}

#[contract]
pub struct SendFunds;

#[contractimpl]
impl SendFunds {
    /// Parent deposits `amount` of `asset` into escrow for `student`.
    pub fn student_fund(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn parents_fund(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn university_fees(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn college_fees(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn hostel_fees(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn mess_fees(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }
    pub fn exam_fees(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<i128, ContractError> {
        Self::deposit(env, parent, student, asset, amount)
    }

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
        category: soroban_sdk::String,
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

        let limit_key = LimitKey {
            tag: symbol_short!("wdlimit"),
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };
        if let Some(limit) = env.storage().persistent().get::<_, i128>(&limit_key) {
            if amount > limit {
                return Err(ContractError::LimitExceeded);
            }
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

        if current_val.balance < 500_000_000 {
            env.events().publish(
                (symbol_short!("low_bal"), parent.clone(), student.clone()),
                (current_val.balance,),
            );
        }

        env.events().publish(
            (symbol_short!("release"), parent.clone(), student.clone()),
            (asset.clone(), amount, current_val.balance),
        );
        env.events().publish(
            (symbol_short!("rel_cat"), parent, student),
            (asset, category),
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

    /// Parent can cancel the escrow immediately and get all funds back.
    pub fn cancel_escrow(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
    ) -> Result<i128, ContractError> {
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
        let refund_amt = current_val.balance;
        current_val.balance = 0;
        env.storage().persistent().set(&key, &current_val);
        let client = token::Client::new(&env, &asset);
        if refund_amt > 0 {
            client.transfer(&env.current_contract_address(), &parent, &refund_amt);
        }
        env.events().publish(
            (symbol_short!("cancel"), parent, student),
            (asset, refund_amt),
        );
        Ok(refund_amt)
    }

    pub fn set_limit(env: Env, parent: Address, student: Address, asset: Address, limit: i128) {
        parent.require_auth();
        let key = LimitKey {
            tag: symbol_short!("wdlimit"),
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };
        env.storage().persistent().set(&key, &limit);
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

    /// Student transfers funds from available balance to their Savings Pool.
    pub fn transfer_to_savings(
        env: Env,
        parent: Address,
        student: Address,
        asset: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        student.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let esc_key = EscrowKey {
            parent: parent.clone(),
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut current_val = env
            .storage()
            .persistent()
            .get::<_, EscrowValue>(&esc_key)
            .unwrap_or(EscrowValue {
                balance: 0,
                disputed: false,
                is_paused: false,
            });

        if current_val.disputed {
            return Err(ContractError::Disputed);
        }

        if amount > current_val.balance {
            return Err(ContractError::InsufficientBalance);
        }

        current_val.balance -= amount;
        env.storage().persistent().set(&esc_key, &current_val);

        let savings_key = SavingsKey {
            student: student.clone(),
            asset: asset.clone(),
        };

        let mut savings_bal = env
            .storage()
            .persistent()
            .get::<_, i128>(&savings_key)
            .unwrap_or(0);
        savings_bal = savings_bal
            .checked_add(amount)
            .ok_or(ContractError::Overflow)?;
        env.storage().persistent().set(&savings_key, &savings_bal);

        env.events().publish(
            (symbol_short!("to_save"), student),
            (asset, amount, savings_bal),
        );
        Ok(())
    }

    /// Read-only: get student savings balance.
    pub fn get_savings(env: Env, student: Address, asset: Address) -> i128 {
        let savings_key = SavingsKey { student, asset };
        env.storage()
            .persistent()
            .get::<_, i128>(&savings_key)
            .unwrap_or(0)
    }

    /// Admin stores a tooltip string for a named UI field on-chain.
    /// `field` is the field name (e.g. "amount", "category", "limit").
    /// `text`  is the help text shown to the student in the dashboard.
    pub fn set_tooltip(
        env: Env,
        admin: Address,
        field: soroban_sdk::String,
        text: soroban_sdk::String,
    ) {
        admin.require_auth();
        let key = TooltipKey {
            field: field.clone(),
        };
        env.storage().persistent().set(&key, &text);
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_AMOUNT, BUMP_AMOUNT);
        env.events()
            .publish((symbol_short!("tooltip"), admin), (field, text));
    }

    /// Read-only: fetch the tooltip text for a named UI field.
    /// Returns an empty string if no tooltip has been set for that field.
    pub fn get_tooltip(env: Env, field: soroban_sdk::String) -> soroban_sdk::String {
        let key = TooltipKey { field };
        env.storage()
            .persistent()
            .get::<_, soroban_sdk::String>(&key)
            .unwrap_or_else(|| soroban_sdk::String::from_str(&env, ""))
    }
}

mod test;
