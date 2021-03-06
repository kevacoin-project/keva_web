import { ElectrumClient } from './electrum_client';
const bitcoin = require('bitcoinjs-lib');
let reverse = require('buffer-reverse');
//let BigNumber = require('bignumber.js');

const IS_DEV = true;

let hardcodedPeers = IS_DEV ?
  [
    { host: '127.0.0.1', ws: '8080' },
  ]
  :
  [
    { host: 'ec0.kevacoin.org', ssl: '50002' },
    { host: 'ec1.kevacoin.org', ssl: '50002' },
  ];

let mainClient = false;
let mainConnected = false;
let wasConnectedAtLeastOnce = false;
let serverName = false;

class KevaElectrumClient {

  async connectMain() {
    let usingPeer = await this.getRandomHardcodedPeer();
    try {
      console.log('begin connection:', JSON.stringify(usingPeer));
      mainClient = new ElectrumClient(usingPeer.ws, usingPeer.host, usingPeer.wss ? 'wss' : 'ws');
      const ver = await mainClient.initElectrum({ client: 'keva_web_client', version: '1.4' });
      if (ver && ver[0]) {
        console.log('connected to ', ver);
        serverName = ver[0];
        mainConnected = true;
        wasConnectedAtLeastOnce = true;
      }
    } catch (e) {
      mainConnected = false;
      console.log('bad connection:', JSON.stringify(usingPeer), e);
    }
  }

  /**
   * Returns random hardcoded electrum server guaranteed to work
   * at the time of writing.
   *
   * @returns {Promise<{tcp, host}|*>}
   */
  async getRandomHardcodedPeer() {
    return hardcodedPeers[(hardcodedPeers.length * Math.random()) | 0];
  }

  /**
   *
   * @param address {String}
   * @returns {Promise<Object>}
   */
  getBalanceByAddress = async function(address) {
    if (!mainClient) throw new Error('Electrum client is not connected');
    let script = bitcoin.address.toOutputScript(address);
    let hash = bitcoin.crypto.sha256(script);
    let reversedHash = Buffer.from(reverse(hash));
    let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
    balance.addr = address;
    return balance;
  };

  getConfig = async function() {
    if (!mainClient) throw new Error('Electrum client is not connected');
    return {
      host: mainClient.host,
      port: mainClient.port,
      status: mainClient.status ? 1 : 0,
      serverName,
    };
  };

  /**
   *
   * @param address {String}
   * @returns {Promise<Array>}
   */
  getTransactionsByAddress = async function(address) {
    if (!mainClient) throw new Error('Electrum client is not connected');
    let script = bitcoin.address.toOutputScript(address);
    let hash = bitcoin.crypto.sha256(script);
    let reversedHash = Buffer.from(reverse(hash));
    let history = await mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));
    return history;
  };

  PING_TIMEOUT = 5000;

  ping = async function() {
    try {
      let promiseTimeout = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Ping timeout')), this.PING_TIMEOUT);
      });
      let promisePing = mainClient.server_ping();
      await Promise.race([promisePing, promiseTimeout]);
    } catch (err) {
      mainConnected = false;
      mainClient.close();
      try {
        let promiseConnect = this.connectMain();
        let promiseTimeout = new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Ping timeout again')), this.PING_TIMEOUT);
        });
        await Promise.race([promiseConnect, promiseTimeout]);
        if (!mainConnected) {
          throw new Error("Cannot reconnect");
        }
      } catch (connErr) {
        throw new Error('Bad network');
      }
      return true;
    }
    return true;
  };

  getTransactionsFullByAddress = async function(address) {
    let txs = await this.getTransactionsByAddress(address);
    let ret = [];
    for (let tx of txs) {
      let full = await mainClient.blockchainTransaction_get(tx.tx_hash, true);
      full.address = address;
      for (let input of full.vin) {
        // now we need to fetch previous TX where this VIN became an output, so we can see its amount
        let prevTxForVin = await mainClient.blockchainTransaction_get(input.txid, true);
        if (prevTxForVin && prevTxForVin.vout && prevTxForVin.vout[input.vout]) {
          input.value = prevTxForVin.vout[input.vout].value;
          // also, we extract destination address from prev output:
          if (prevTxForVin.vout[input.vout].scriptPubKey && prevTxForVin.vout[input.vout].scriptPubKey.addresses) {
            input.addresses = prevTxForVin.vout[input.vout].scriptPubKey.addresses;
          }
        }
      }

      for (let output of full.vout) {
        if (output.scriptPubKey && output.scriptPubKey.addresses) output.addresses = output.scriptPubKey.addresses;
      }
      full.inputs = full.vin;
      full.outputs = full.vout;
      delete full.vin;
      delete full.vout;
      delete full.hex; // compact
      delete full.hash; // compact
      ret.push(full);
    }

    return ret;
  };

  /**
   *
   * @param addresses {Array}
   * @param batchsize {Number}
   * @returns {Promise<{balance: number, unconfirmed_balance: number, addresses: object}>}
   */
  multiGetBalanceByAddress = async function(addresses, batchsize) {
    batchsize = batchsize || 100;
    if (!mainClient) throw new Error('Electrum client is not connected');
    let ret = { balance: 0, unconfirmed_balance: 0, addresses: {} };

    let chunks = this.splitIntoChunks(addresses, batchsize);
    for (let chunk of chunks) {
      let scripthashes = [];
      let scripthash2addr = {};
      for (let addr of chunk) {
        let script = bitcoin.address.toOutputScript(addr);
        let hash = bitcoin.crypto.sha256(script);
        let reversedHash = Buffer.from(reverse(hash));
        reversedHash = reversedHash.toString('hex');
        scripthashes.push(reversedHash);
        scripthash2addr[reversedHash] = addr;
      }

      let balances = [];
      balances = await mainClient.blockchainScripthash_getBalanceBatch(scripthashes);

      for (let bal of balances) {
        ret.balance += +bal.result.confirmed;
        ret.unconfirmed_balance += +bal.result.unconfirmed;
        ret.addresses[scripthash2addr[bal.param]] = bal.result;
      }
    }

    return ret;
  };

  multiGetUtxoByAddress = async function(addresses, batchsize) {
    batchsize = batchsize || 100;
    if (!mainClient) throw new Error('Electrum client is not connected');
    let ret = {};

    let chunks = this.splitIntoChunks(addresses, batchsize);
    for (let chunk of chunks) {
      let scripthashes = [];
      let scripthash2addr = {};
      for (let addr of chunk) {
        let script = bitcoin.address.toOutputScript(addr);
        let hash = bitcoin.crypto.sha256(script);
        let reversedHash = Buffer.from(reverse(hash));
        reversedHash = reversedHash.toString('hex');
        scripthashes.push(reversedHash);
        scripthash2addr[reversedHash] = addr;
      }

      let results = [];
      results = await mainClient.blockchainScripthash_listunspentBatch(scripthashes);

      for (let utxos of results) {
        ret[scripthash2addr[utxos.param]] = utxos.result;
        for (let utxo of ret[scripthash2addr[utxos.param]]) {
          utxo.address = scripthash2addr[utxos.param];
          utxo.txId = utxo.tx_hash;
          utxo.vout = utxo.tx_pos;
          delete utxo.tx_pos;
          delete utxo.tx_hash;
        }
      }
    }

    return ret;
  };

  multiGetHistoryByAddress = async function(addresses, batchsize) {
    batchsize = batchsize || 100;
    if (!mainClient) throw new Error('Electrum client is not connected');
    let ret = {};

    let chunks = this.splitIntoChunks(addresses, batchsize);
    for (let chunk of chunks) {
      let scripthashes = [];
      let scripthash2addr = {};
      for (let addr of chunk) {
        let script = bitcoin.address.toOutputScript(addr);
        let hash = bitcoin.crypto.sha256(script);
        let reversedHash = Buffer.from(reverse(hash));
        reversedHash = reversedHash.toString('hex');
        scripthashes.push(reversedHash);
        scripthash2addr[reversedHash] = addr;
      }

      let results = [];
      results = await mainClient.blockchainScripthash_getHistoryBatch(scripthashes);

      for (let history of results) {
        ret[scripthash2addr[history.param]] = history.result;
        for (let hist of ret[scripthash2addr[history.param]]) {
          hist.address = scripthash2addr[history.param];
        }
      }
    }

    return ret;
  };

  multiGetTransactionByTxid = async function(txids, batchsize, verbose, cb) {
    batchsize = batchsize || 45;
    // this value is fine-tuned so althrough wallets in test suite will occasionally
    // throw 'response too large (over 1,000,000 bytes', test suite will pass
    verbose = verbose !== false;
    if (!mainClient) throw new Error('Electrum client is not connected');
    let ret = {};
    let txidsToFetch = [...new Set(txids)]; // deduplicate just for any case
    let totalToFetch = txidsToFetch.length;
    let fetched = 0;
    let chunks = this.splitIntoChunks(txidsToFetch, batchsize);
    for (let chunk of chunks) {
      let results = [];
      results = await mainClient.blockchainTransaction_getBatch(chunk, verbose);
      if (cb) {
        fetched += chunk.length;
        cb(totalToFetch, fetched);
      }

      for (let txdata of results) {
        if (txdata.error && txdata.error.code === -32600) {
          // response too large
          // lets do single call, that should go through okay:
          txdata.result = await mainClient.blockchainTransaction_get(txdata.param, verbose);
        }
        ret[txdata.param] = txdata.result;
      }
    }

    return ret;
  };

  /**
   * Simple waiter till `mainConnected` becomes true (which means
   * it Electrum was connected in other function), or timeout 30 sec.
   *
   *
   * @returns {Promise<Promise<*> | Promise<*>>}
   */
  waitTillConnected = async function() {
    let waitTillConnectedInterval = false;
    let retriesCounter = 0;
    return new Promise(function(resolve, reject) {
      waitTillConnectedInterval = setInterval(() => {
        if (mainConnected) {
          clearInterval(waitTillConnectedInterval);
          resolve(true);
        }

        if (wasConnectedAtLeastOnce && mainClient.status === 1) {
          clearInterval(waitTillConnectedInterval);
          mainConnected = true;
          resolve(true);
        }

        if (retriesCounter++ >= 30) {
          clearInterval(waitTillConnectedInterval);
          reject(new Error('Waiting for Electrum connection timeout'));
        }
      }, 500);
    });
  };

  estimateFees = async function() {
    const fast = await this.estimateFee(1);
    const medium = await this.estimateFee(18);
    const slow = await this.estimateFee(144);
    return { fast, medium, slow };
  };

  /**
   * Returns the estimated transaction fee to be confirmed within a certain number of blocks
   *
   * @param numberOfBlocks {number} The number of blocks to target for confirmation
   * @returns {Promise<number>} Satoshis per byte
   */
  estimateFee = async function(numberOfBlocks) {
    if (!mainClient) throw new Error('Electrum client is not connected');
    numberOfBlocks = numberOfBlocks || 1;
    let coinUnitsPerKilobyte = await mainClient.blockchainEstimatefee(numberOfBlocks);
    if (coinUnitsPerKilobyte === -1) return 1;
    /*
    return Math.round(
      new BigNumber(coinUnitsPerKilobyte)
        .dividedBy(1024)
        .multipliedBy(100000000)
        .toNumber(),
    );
    */
    return 1024;
  };

  serverFeatures = async function() {
    if (!mainClient) throw new Error('Electrum client is not connected');
    return mainClient.server_features();
  };

  broadcast = async function(hex) {
    if (!mainClient) throw new Error('Electrum client is not connected');
    try {
      const broadcast = await mainClient.blockchainTransaction_broadcast(hex);
      return broadcast;
    } catch (error) {
      return error;
    }
  };

  broadcastV2 = async function(hex) {
    if (!mainClient) throw new Error('Electrum client is not connected');
    return mainClient.blockchainTransaction_broadcast(hex);
  };

  estimateCurrentBlockheight = function() {
    const baseTs = 1587570465609; // uS
    const baseHeight = 627179;
    return Math.floor(baseHeight + (+new Date() - baseTs) / 1000 / 60 / 9.5);
  };


  /**
   *
   * @param host
   * @param tcpPort
   * @param sslPort
   * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
   */
  testConnection = async function(host, tcpPort, sslPort) {
    let client = new ElectrumClient(sslPort || tcpPort, host, sslPort ? 'tls' : 'tcp');
    try {
      await client.connect();
      await client.server_version('2.7.11', '1.4');
      await client.server_ping();
      client.close();
      return true;
    } catch (_) {
      return false;
    }
  };

  forceDisconnect = () => {
    mainClient.close();
  };

  splitIntoChunks = function(arr, chunkSize) {
    let groups = [];
    let i;
    for (i = 0; i < arr.length; i += chunkSize) {
      groups.push(arr.slice(i, i + chunkSize));
    }
    return groups;
  };

  blockchainTransaction_get = async function(tx_hash, verbose) {
    const tx = await mainClient.blockchainTransaction_get(tx_hash, verbose);
    return tx;
  }

  blockchainTransaction_getBatch = async function(tx_hash, verbose) {
    return await mainClient.blockchainTransaction_getBatch(tx_hash, verbose);
  }

  blockchainScripthash_getHistory = async function(scriptHash) {
    return await mainClient.blockchainScripthash_getHistory(scriptHash);
  }

  blockchainTransaction_getMerkle = async function(txid, height, merkel) {
    return await mainClient.blockchainTransaction_getMerkle(txid, height, merkel);
  }

  blockchainTransaction_idFromPos = async function(height, pos) {
    let txid = await mainClient.blockchainTransaction_idFromPos(height, pos);
    return txid;
  }

}

export const KevaClient = new KevaElectrumClient();
