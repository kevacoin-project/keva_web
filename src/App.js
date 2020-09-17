import React, { Component } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import { connectMain, ping, serverFeatures } from './keva_electrum';

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
    await connectMain();
    const isConnected = await ping();
    if (isConnected) {
      let feature = await serverFeatures();
      this.setState({feature: JSON.stringify(feature)});
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
