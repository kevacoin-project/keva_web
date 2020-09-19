import React, { Component } from 'react';
import Alert from 'react-bootstrap/Alert';
import { KevaClient } from './keva_electrum';
import {
  getNamespaceInfoFromShortCode, fetchKeyValueList,
  getNamespaceScriptHash, mergeKeyValueList
} from './keva_ops';
import Ipfs from 'ipfs';
import { ImageUpload } from './ImageUpload';

class Page extends Component {

  constructor(props) {
    super();
    this.ipfs = null;
  }

  render() {
    const {feature} = this.props;
    if (!feature) {
      return <Alert variant="danger">
        <Alert.Heading>No Connection to ElectrumX server</Alert.Heading>
        <p>
          Check your connection again.
        </p>
      </Alert>
    }
    return (
      <div>
        <p>{feature}</p>
      </div>
    )
  }
}

class Main extends Component {

  constructor(props) {
    super();
    this.state = {
      feature: '',
      ipfsVersion: '',
    };
  }

  async startIpfs() {
    if (this.ipfs) {
      console.log('IPFS already started');
    } else {
      try {
        console.time('IPFS Started');
        this.ipfs = await Ipfs.create();
        const ipfsVersion = await this.ipfs.version();
        this.setState({ipfsVersion: ipfsVersion.version});
        console.timeEnd('IPFS Started');
      } catch (error) {
        console.error('IPFS init error:', error);
        this.ipfs = null;
      }
    }
  }

  stopIpfs() {
    if (this.ipfs && this.ipfs.stop) {
      console.log('Stopping IPFS');
      this.ipfs.stop().catch(err => console.error(err));
      this.ipfs = null;
    }
  }

  onUpload = async (file) => {
    const fileInfo = await this.ipfs.add(file);
    console.log('Added file:', fileInfo.path, fileInfo.cid.toString());
  }

  async getKeva() {
    // Keva
    await KevaClient.connectMain();
    const isConnected = await KevaClient.ping();
    if (isConnected) {
      const shortCode = '5570511';
      let nsInfo = await getNamespaceInfoFromShortCode(KevaClient, shortCode);
      const history = await KevaClient.blockchainScripthash_getHistory(getNamespaceScriptHash(nsInfo.namespaceId));
      let keyValues = await fetchKeyValueList(KevaClient, history, [], true);
      keyValues = mergeKeyValueList(keyValues);
      this.setState({feature: JSON.stringify(keyValues)});
    }
  }

  async componentDidMount() {
    // Start IPFS.
    await this.startIpfs();
  }

  render() {
    return (
      <div style={{padding: 20}}>
        <p>IPFS ID: {this.state.ipfsVersion}</p>
        {/*<Page feature={this.state.feature}/> */}
        <ImageUpload onUpload={this.onUpload} />
      </div>
    )
  }
}

function App() {
  return (
    <div className="App">
      <Main />
    </div>
  );
}

export default App;
