import React, {useCallback, useState} from 'react'
import Spinner from 'react-bootstrap/Spinner';
import {useDropzone} from 'react-dropzone'
import styled from 'styled-components'
import { FiImage, FiCheckCircle,  FiUploadCloud} from "react-icons/fi";

const InputDiv = styled.div`
  align-self: center;
  borderWidth: 0;
  margin-top: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  :hover: {
    color: red;
  }
  :focus {
    outline: none;
  }
`

const FileIcon = styled(FiImage)`
  color: #2980B9;
  font-size: 30px;
  align-self: center;
  :hover {
    color: #7FB3D5;
  }
`

const UploadIcon = styled(FiUploadCloud)`
  cursor: pointer;
  color: green;
  font-size: 28px;
  align-self: center;
`

const CheckIcon = styled(FiCheckCircle)`
  cursor: pointer;
  color: green;
  font-size: 28px;
  align-self: center;
`

const SpinnerIcon = styled(Spinner)`
  color: green;
  align-self: center;
`

const StyledImg = styled.img`
  height: 300px;
  width: 300px;
  object-fit: contain;
  align-self: center;
`

const ImgContainer = styled.div`
  height: 300px;
  width: 300px;
  border-width: 1px;
  border-style: solid;
  border-color: #e0e0e0;
  border-radius: 10px;
  background-color: #f3f3f3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: cener;
`

const Backdrop = styled.div`
  align-self: center;
  position: absolute;
  top: 330px;
  left: calc(50% - 20px);
  height: 40px;
  width: 40px;
  border-radius: 40px;
  background-color: #fff;
  display: flex;
  justify-content: center;
  box-shadow: 3px 3px 3px rgba(50,50,50,0.28);
`

export function ImageUpload(props) {
  const [imageURL, setImageURL] = useState('');
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onabort = () => console.log('file reading was aborted');
      reader.onerror = () => console.log('file reading has failed');
      reader.onload = () => {
        setImageURL(reader.result);
      }
      reader.readAsDataURL(file);
      props.onFileChange(file);
    })

  }, []);

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  let icon = null;
  if (props.pinned) {
    icon = <CheckIcon/>
  } else if (props.pinning) {
    icon = (
      <SpinnerIcon animation="border" role="status">
      </SpinnerIcon>
    );
  } else {
    icon = <UploadIcon onClick={props.onUpload}/>
  }

  return (
    <>
      <p style={{alignSelf: 'center', fontSize: 18, color: '#555'}}>IPFS Browser Node</p>
      <InputDiv {...getRootProps({ refKey: 'innerRef' })}>
        <input {...getInputProps()} />
        <ImgContainer>
          {(imageURL.length > 0) ?
            <StyledImg src={imageURL} />
            :
            <>
              <FileIcon />
              <p style={{alignSelf: 'center', fontSize: 12, color: '#777', marginTop: 10}}>Click to Add Image</p>
            </>
          }
        </ImgContainer>
      </InputDiv>
      {
        (imageURL.length > 0) &&
        <Backdrop style={{pointerEvents: props.pinned ? 'none' : 'auto'}}>{ icon }</Backdrop>
      }
    </>
  )
}
