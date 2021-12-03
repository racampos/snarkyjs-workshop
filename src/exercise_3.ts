import {
  Field,
  PrivateKey,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  UInt64,
  Mina,
  Party,
  Poseidon,
} from '@o1labs/snarkyjs';

class Exercise3 extends SmartContract {
  @state(Field) value: State<Field>;

  static UpdateReward: UInt64 = UInt64.fromNumber(100);

  constructor(initialBalance: UInt64, address: PublicKey, x: Field) {
    super(address);
    this.balance.addInPlace(initialBalance);
    this.value = State.init(x);
  }

  @method async update() {
    const x = await this.value.get();
    this.value.set(Poseidon.hash([x]));
    this.balance.subInPlace(Exercise3.UpdateReward);
  }
}

export async function run() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const account1 = Local.testAccounts[0].privateKey;
  const account2 = Local.testAccounts[1].privateKey;
  const account2Pubkey = account2.toPublicKey();

  const snappPrivkey = PrivateKey.random();
  const snappPubkey = snappPrivkey.toPublicKey();

  let snappInstance: Exercise3;
  const initSnappState = new Field(3);

  // Deploys the snapp
  await Mina.transaction(account1, async () => {
    // account2 sends 1000000000 to the new snapp account
    const amount = UInt64.fromNumber(1000000000);
    const p = await Party.createSigned(account2);
    p.balance.subInPlace(amount);

    snappInstance = new Exercise3(amount, snappPubkey, initSnappState);
  })
    .send()
    .wait();

  // Update the snapp, send the reward to account2
  await Mina.transaction(account1, async () => {
    await snappInstance.update();
    const winner = Party.createUnsigned(account2Pubkey);
    winner.balance.addInPlace(Exercise3.UpdateReward);
  })
    .send()
    .wait();

  console.log('');
  console.log('Exercise 3');

  const a = await Mina.getAccount(snappPubkey);

  console.log('final state value', a.snapp.appState[0].toString());
}
