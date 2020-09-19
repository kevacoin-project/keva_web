import React, { Component } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

export class ImageUpload extends Component {

  constructor(props) {
    super(props);
    this.state = {
      file: '',
      imagePreviewUrl: ''
    };
    this._handleImageChange = this._handleImageChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);
  }

  _handleSubmit(e) {
    e.preventDefault();
    const onUpload = this.props.onUpload;
    onUpload && onUpload(this.state.file);
  }

  _handleImageChange(e) {
    e.preventDefault();

    let reader = new FileReader();
    let file = e.target.files[0];
    reader.onloadend = () => {
      this.setState({
        file: file,
        imagePreviewUrl: reader.result
      });
    }
    reader.readAsDataURL(file)
  }

  render() {
    let { imagePreviewUrl } = this.state;
    let imagePreview = null;
    if (imagePreviewUrl) {
      imagePreview = (<img src={imagePreviewUrl} style={{width: 300, height: 'auto'}}/>);
    }

    return (
      <div>
        <Form onSubmit={this._handleSubmit}>
          <Form.Group>
            <Form.File id="exampleFormControlFile1" onChange={this._handleImageChange}/>
          </Form.Group>
          <Form.Group>
            <Button type="submit" onClick={this._handleSubmit} disabled={!this.state.file} variant="primary">
              Upload Image
            </Button>
          </Form.Group>
        </Form>
        {imagePreview}
      </div>
    )
  }

}
