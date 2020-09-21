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

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

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
      cids: [],
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
    if (ipfsPeers.length > 0) {
      let cids = [];
      for await (const { cid, type } of this.ipfs.pin.ls()) {
        if (type == 'recursive') {
          cids.push(cid);
        }
      }
      this.setState({cids, ipfsPeers});
    } else {
      this.setState({
        ipfsPeers: [],
      });
    }
  }

  stopIpfs() {
    if (this.ipfs && this.ipfs.stop) {
      console.log('Stopping IPFS');
      this.ipfs.stop().catch(err => console.error(err));
      this.ipfs = null;
    }
  }

  onFileChange = async (file) => {
    this.fileToUpload = file;
    this.setState({pinned: false})
  }

  onUpload = async () => {
    if (!this.fileToUpload) {
      return;
    }
    this.setState({pinning: true});
    // This is to remove the "path" attribute from this.fileToUpload.
    let file = new File([this.fileToUpload], this.fileToUpload.name);
    const fileInfo = await this.ipfs.add(file);
    console.log('Added file:', fileInfo.path, fileInfo.cid.toString());
    await sleep(1000);
    let cids = [];
    for await (const { cid, type } of this.ipfs.pin.ls()) {
      if (type == 'recursive') {
        cids.push(cid);
      }
    }
    this.setState({pinned: true, pinning: false, cids});
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
    setInterval(async () => await this.checkPeers(), 5000);
  }

  render() {
    const {pinned, pinning, cids} = this.state;
    let pinnedFiles = cids.map((c, i) => {
      return (
        <div key={i} style={{alignSelf: 'center'}}>
          <a href={`https://ipfs.io/ipfs/${c}`} style={{fontSize: 12}} target="_blank">{c.toString()}</a>
        </div>
      )
    })
    return (
      <Container>
        {/*<Page feature={this.state.feature}/> */}
        <ImageUpload onUpload={this.onUpload} onFileChange={this.onFileChange} pinned={pinned} pinning={pinning}/>
        <div style={{marginTop: 10, marginBottom: 10, alignSelf: 'center'}}>
          { pinnedFiles }
        </div>
        <Info>Status: {
          this.state.ipfsPeers.length > 0
          ?
          <span style={{color: 'green'}}>{this.state.ipfsPeers.length} Peers Connected</span>
          :
          <span style={{color: 'orange'}}>Connecting to Peers ...</span>
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
