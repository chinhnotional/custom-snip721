const {
    EnigmaUtils,
    Secp256k1Pen,
    SigningCosmWasmClient,
    pubkeyToAddress,
    encodeSecp256k1Pubkey,
  } = require("secretjs");
  const fs = require("fs");
  
  // Load environment variables
  require("dotenv").config();
  
  const customFees = {
    upload: {
      amount: [{ amount: "5000000", denom: "uscrt" }],
      gas: "5000000",
    },
    init: {
      amount: [{ amount: "500000", denom: "uscrt" }],
      gas: "500000",
    },
    exec: {
      amount: [{ amount: "500000", denom: "uscrt" }],
      gas: "500000",
    },
    send: {
      amount: [{ amount: "80000", denom: "uscrt" }],
      gas: "80000",
    },
  };
  
  const main = async () => {
    const httpUrl = process.env.SECRET_REST_URL;
  
    // mnemonic
    const mnemonic = process.env.MNEMONIC;
  
    // A pen is the most basic tool you can think of for signing.
    // This wraps a single keypair and allows for signing.
    const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic).catch((err) => {
      throw new Error(`Could not get signing pen: ${err}`);
    });
  
    // Get the public key
    const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);
  
    // get the wallet address
    const accAddress = pubkeyToAddress(pubkey, "secret");
  
    // 1. Initialize client
    const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();

    const client = new SigningCosmWasmClient(
      httpUrl,
      accAddress,
      (signBytes) => signingPen.sign(signBytes),
      txEncryptionSeed, customFees,
    );
    console.log(`Wallet address=${accAddress}`);
    // 2. Upload the contract wasm
    const wasm = fs.readFileSync('./contract.wasm');
    console.log('Uploading contract');
    const uploadReceipt = await client.upload(wasm, {})
      .catch((err) => { throw new Error(`Could not upload contract: ${err}`); });
    
    console.log(uploadReceipt);
    // Get the code ID from the receipt
    const { codeId } = uploadReceipt;
    // 3. Create an instance of the NFT contract init msg
  
    const initMsg = {
      /// name of token contract
      name: 'The Very First Test',
      /// token contract symbol
      symbol: 'TVFT',
      /// entropy used for prng seed
      entropy: 'qwyugwirqrqoirbhfbjhdvy',
      /// optional privacy configuration for the contract
      config: {
          public_owner: true,
          public_token_supply: true
      },
    }
    const contract = await client
      .instantiate(
        codeId,
        initMsg,
        `My Snip721${Math.ceil(Math.random() * 10000)}`
      )
      .catch((err) => {
        throw new Error(`Could not instantiate contract: ${err}`);
      });
    const { contractAddress } = contract;
    console.log("init contract: ", contract, "address:", contractAddress);
  };
  
  main().catch((err) => {
    console.error(err);
  });