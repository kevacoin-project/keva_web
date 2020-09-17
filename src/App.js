import React, { Component } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

class Page extends Component {

  constructor(props) {
    super();
    this.state = {
      show: false,
      serverVersion: 'N/A',
    };
  }

  checkServer = () => {
    const {websocket} = this.props;
  }

  render() {
    const {websocket} = this.props;
    if (!websocket) {
      return <Alert variant="danger">
        <Alert.Heading>No Connection to ElectrumX server</Alert.Heading>
        <p>
          Check your connection again.
        </p>
      </Alert>
    }
    return (
      <div>
        <p>{this.state.serverVersion}</p>
        <Button onClick={() => this.checkServer()}>Check Server</Button>
      </div>
    )
  }
}

class Main extends Component {

  constructor(props) {
    super();
    this.state = {
      ws: null
    };
  }

  // single websocket instance for the own application and constantly trying to reconnect.
  componentDidMount() {
    this.connect();
  }

  timeout = 250; // Initial timeout duration as a class variable

  /**
   * @function connect
   * This function establishes the connect with the websocket and also ensures constant reconnection if connection closes
   */
  connect = () => {
    var ws = new WebSocket("ws://localhost:8080/");
    let that = this; // cache the this
    var connectInterval;

    // websocket onopen event listener
    ws.onopen = () => {
      console.log("connected websocket main component");

      this.setState({ ws: ws });

      that.timeout = 250; // reset timer to 250 on open of websocket connection
      clearTimeout(connectInterval); // clear Interval on on open of websocket connection
    };

    // websocket onclose event listener
    ws.onclose = e => {
      console.log(
        `Socket is closed. Reconnect will be attempted in ${Math.min(
          10000 / 1000,
          (that.timeout + that.timeout) / 1000
        )} second.`,
        e.reason
      );

      that.timeout = that.timeout + that.timeout; //increment retry interval
      connectInterval = setTimeout(this.check, Math.min(10000, that.timeout)); //call check function after timeout
    };

    // websocket onerror event listener
    ws.onerror = err => {
      console.error(
        "Socket encountered error: ",
        err.message,
        "Closing socket"
      );

      ws.close();
    };
  };

  /**
   * utilited by the @function connect to check if the connection is close, if so attempts to reconnect
   */
  check = () => {
    const { ws } = this.state;
    if (!ws || ws.readyState == WebSocket.CLOSED) this.connect(); //check if websocket instance is closed, if so call `connect` function.
  };

  render() {
    return <Page websocket={this.state.ws} />;
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
