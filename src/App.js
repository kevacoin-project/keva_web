import React, { Component } from 'react';
import Alert from 'react-bootstrap/Alert';
import { KevaClient } from './keva_electrum';
import {
  getNamespaceInfoFromShortCode, fetchKeyValueList,
  getNamespaceScriptHash, mergeKeyValueList
} from './keva_ops';

class Page extends Component {

  constructor(props) {
    super();
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
    };
  }

  async componentDidMount() {
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

  render() {
    return <Page feature={this.state.feature}/>;
  }
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Main />
      </header>
    </div>
  );
}

export default App;
