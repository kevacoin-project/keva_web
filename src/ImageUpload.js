import React, {useCallback, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import styled from 'styled-components'
import { FiImage } from "react-icons/fi";

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

const StyledIcon = styled(FiImage)`
  color: #2980B9;
  font-size: 26px;
  align-self: center;
  :hover {
    color: #7FB3D5;
  }
`

const StyledImg = styled.img`
  height: 300px;
  width: 300px;
  object-fit: contain;
  align-self: center;
`

const ImgContainer = styled.div`
  height: 350px;
  width: 350px;
  border-width: 1px;
  border-style: solid;
  border-color: #e0e0e0;
  border-radius: 10px;
  display: flex;
  justify-content: center;
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
      props.onUpload(file);
    })

  }, []);

  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
    <InputDiv {...getRootProps({ refKey: 'innerRef' })}>
      <input {...getInputProps()} />
      <ImgContainer>
        {(imageURL.length > 0) ? <StyledImg src={imageURL} /> : <StyledIcon />}
      </ImgContainer>
    </InputDiv>
  )
}
