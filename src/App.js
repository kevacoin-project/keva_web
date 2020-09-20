import React, { Component } from 'react';
import styled from 'styled-components'
import Alert from 'react-bootstrap/Alert';
import { KevaClient } from './keva_electrum';
import {
  getNamespaceInfoFromShortCode, fetchKeyValueList,
  getNamespaceScriptHash, mergeKeyValueList
} from './keva_ops';
import Ipfs from 'ipfs';
import { ImageUpload } from './ImageUpload';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 20px;
`;

const Info = styled.p`
  align-self: center;
  text-align: center;
  font-size: 12px;
  color: #aaa;
  line-height: 4px;
`;

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
      ipfsPeers: [],
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
        const ipfsID = await this.ipfs.id();
        const ipfsPeers = await this.ipfs.swarm.peers();
        this.setState({
          ipfsVersion: ipfsVersion.version,
          ipfsID: ipfsID.id,
          ipfsPeers: ipfsPeers,
        });
        console.timeEnd('IPFS Started');
      } catch (error) {
        console.error('IPFS init error:', error);
        this.ipfs = null;
      }
    }
  }

  checkPeers = async () => {
    if (!this.ipfs) {
      return;
    }
    const ipfsPeers = await this.ipfs.swarm.peers();
    this.setState({
      ipfsPeers: ipfsPeers,
    });
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
    setInterval(async () => await this.checkPeers(), 2000);
  }

  render() {
    return (
      <Container>
        {/*<Page feature={this.state.feature}/> */}
        <ImageUpload onUpload={this.onUpload} />
        <Info>Status: {
          this.state.ipfsPeers.length > 0
          ?
          <span style={{color: 'green'}}>Connected</span>
          :
          <span style={{color: 'orange'}}>Waiting for connection</span>
        }
        </Info>
        <Info>Peer Id: {this.state.ipfsID}</Info>
        <Info>IPFS Version: {this.state.ipfsVersion}</Info>
      </Container>
    )
  }
}

function App() {
  return <Main />;
}

export default App;
