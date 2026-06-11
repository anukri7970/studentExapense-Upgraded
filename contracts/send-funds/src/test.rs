#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Env,
};

fn setup<'a>(env: &Env) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
    let admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let asset_address = sac.address();
    let token_client = TokenClient::new(env, &asset_address);
    let asset_client = StellarAssetClient::new(env, &asset_address);
    (asset_address, token_client, asset_client)
}

#[test]
fn deposit_then_release_full_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, token_client, asset_client) = setup(&env);

    asset_client.mint(&parent, &1_000);
    assert_eq!(token_client.balance(&parent), 1_000);

    let balance_after_deposit = client.deposit(&parent, &student, &asset, &500);
    assert_eq!(balance_after_deposit, 500);
    assert_eq!(token_client.balance(&parent), 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    let queried = client.get_balance(&parent, &student, &asset);
    assert_eq!(queried, 500);

    let remaining = client.release(&parent, &student, &asset, &500);
    assert_eq!(remaining, 0);
    assert_eq!(token_client.balance(&student), 500);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn partial_release_keeps_remainder_escrowed() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, token_client, asset_client) = setup(&env);

    asset_client.mint(&parent, &1_000);
    client.deposit(&parent, &student, &asset, &300);

    let remaining = client.release(&parent, &student, &asset, &120);
    assert_eq!(remaining, 180);
    assert_eq!(token_client.balance(&student), 120);
    assert_eq!(client.get_balance(&parent, &student, &asset), 180);
}

#[test]
fn multiple_deposits_accumulate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, _token_client, asset_client) = setup(&env);

    asset_client.mint(&parent, &1_000);
    client.deposit(&parent, &student, &asset, &100);
    client.deposit(&parent, &student, &asset, &250);

    assert_eq!(client.get_balance(&parent, &student, &asset), 350);
}

#[test]
fn release_more_than_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, _token_client, asset_client) = setup(&env);

    asset_client.mint(&parent, &1_000);
    client.deposit(&parent, &student, &asset, &100);

    let result = client.try_release(&parent, &student, &asset, &500);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn deposit_zero_or_negative_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, _token_client, asset_client) = setup(&env);

    asset_client.mint(&parent, &1_000);

    let result = client.try_deposit(&parent, &student, &asset, &0);
    assert_eq!(result, Err(Ok(ContractError::InvalidAmount)));

    let result_neg = client.try_deposit(&parent, &student, &asset, &-50);
    assert_eq!(result_neg, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn deposit_requires_parent_auth() {
    let env = Env::default();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, _token_client, asset_client) = setup(&env);

    env.mock_all_auths();
    asset_client.mint(&parent, &1_000);

    // Call deposit while only mocking auth for a *different* address.
    // The parent's own signature is never provided, so this must fail
    // authorization rather than silently succeed.
    let impostor = Address::generate(&env);
    let result = client
        .mock_auths(&[MockAuth {
            address: &impostor,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "deposit",
                args: (parent.clone(), student.clone(), asset.clone(), 100_i128).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_deposit(&parent, &student, &asset, &100);

    assert!(result.is_err());
}

#[test]
fn balance_for_unknown_pair_is_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SendFunds, ());
    let client = SendFundsClient::new(&env, &contract_id);

    let parent = Address::generate(&env);
    let student = Address::generate(&env);
    let (asset, _token_client, _asset_client) = setup(&env);

    assert_eq!(client.get_balance(&parent, &student, &asset), 0);
}
