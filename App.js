/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  SafeAreaViewBase
} from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals
} from 'react-native-webrtc';
import {createStackNavigator} from '@react-navigation/stack'
import  {NavigationContainer} from '@react-navigation/native'
import io from 'socket.io-client';
import callScreen from './screen/call'

const dimensions = Dimensions.get('window')

class App extends React.Component{

  constructor(props)
  {
    super(props);
    this.state = {
      localStream : null,
      remoteStream : null,
      meeting_id: "",
      client_password: "",
    }
    this.sdp
    this.socket = null
    this.candidates = []
    this.remoteBool = false;
  }
  componentDidMount = () => {
    console.log('comonent di mount app.js')
    this.socket = io.connect(
      'https://d7352b6c0d0c.ngrok.io/webrtcPeer',
      {
        // path: '/vcallx-web',
        query: {}
      }
    )
    this.socket.on('connection-success', success => {
      console.log("success",success)
    })
    this.socket.on('offerOrAnswer', (sdp) => {
      this.sdp = JSON.stringify(sdp)
      //console.log(sdp)
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })
    this.socket.on('candidate', (candidate) => {
      //console.log(candidate)
      this.pc.addIceCandidate(new RTCIceCandidate(candidate)).then(() => console.log("candidate added suscessfull"),(err) => console.log("candidate error: ",err)
      
      )
      if(this.remoteBool)
      {
      	this.remoteBool = false;
       this.accepted()
       }
    })
    this.socket.on('password',(password) => {
      this.setState({
        meeting_id : password
      })
    })
    this.socket.on('disconnect-call',(data) => {
      this.disconnect();
    })
    this.socket.on('accepted-call',(data) => {
    	this.remoteBool = true;
    	})
    this.setLocalVideo();
    this.createPc();
    
    } 

    handleOnaddstreamEvent = (e) => {
      // console.log("remote srcObject", e.streams)
       //this.remoteVideoref.current.srcObject = e.stream
       debugger
      // console.log("remote stresan: " ,e.stream)
       this.setState({
         remoteStream : e.stream,
       })
     }
     handleICEcandidatesEvent = (e) => {
      // if(e.candidate) console.log(JSON.stringify(e.candidate))

      if(e.candidate){
        this.sendToPeer('candidate', e.candidate)
      }
    }
    createPc = () => {
      const pc_config = {
        "iceServers": [
          {
            urls : 'stun:stun.l.google.com:19302'
          },
          {
            urls: 'turn:numb.viagenie.ca',
            credential:"nishit130",
            username: "nishitlimbani130@gmail.com"
          },
        ]
      }
      this.pc = new RTCPeerConnection(pc_config)
      this.pc.onicecandidate = this.handleICEcandidatesEvent;
      this.pc.onaddstream = this.handleOnaddstreamEvent;
    }
    setLocalVideo = () => {
      console.log('setLocalVideo called')
      let isFront = false;
      mediaDevices.enumerateDevices().then(sourceInfos => {
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
            videoSourceId = sourceInfo.deviceId;
          }
        }
        mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
          }
        })
        .then(stream => {
          this.setState({
            localStream : stream,
          })
         // console.log(stream.toURL())
          //this.localVideoref.current.srcObject = stream
        })
        .catch(streamError => {
          console.log("Stream Error: ",streamError)
        });
        });
    }
    setstream = () => {
      if(this.state.localStream)
      {
        this.pc.addStream(this.state.localStream);
        console.log('stream added!');
      }
    }
        makeid(length) {
          var result           = '';
          var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          var charactersLength = characters.length;
          for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
          }
          return result;
        }

        sendToPeer = (messageType, payload) => {
          this.socket.emit(messageType, {
            socketID : this.socket.id,
            payload
          })
        }
        
        createOffer = () => {
          this.setState({remoteBool : true})
          this.setstream();
          if(this.pc == null)
            {this.createPc();
            console.log('offer')}
          
          this.pc.createOffer({offerToReceiveVideo:1}).then(sdp => {
            // console.log(JSON.stringify(sdp))
            var password = 'a'
            this.pc.setLocalDescription(sdp).then(() => console.log("local descp added"))
            this.sendToPeer('offerOrAnswer', sdp)
            this.sendToPeer('password',password)
            this.setState({client_password : password})
            console.log("pass: ",this.state.password_client)
          }).then(() => console.log("call sucess: "),(err) => console.log("call error: ",this.pc,err)
          )
        }
	
        setRemoteDescription = () => {
          const desc = JSON.parse(this.sdp)
          this.pc.setRemoteDescription(new RTCSessionDescription(desc)).then(() => console.log("remote descp added"))
        }
      
        createAnswer = () => {
          if(this.state.meeting_id == this.state.client_password)
          {
            this.setstream();
            this.setState({remoteBool : true});
            this.pc.createAnswer({offerToReceiveVideo: 1}).then(sdp => {
              // console.log(JSON.stringify(sdp)
              this.sendToPeer('offerOrAnswer', sdp)
              this.pc.setLocalDescription(sdp)
            }).then(() => this.props.navigation.navigate('call', {remoteStream:this.state.remoteStream,localStream: this.state.localStream, pc : this.pc})
, (err) => console.log("answer error",err)
            )
          }
          else{
            console.log("pass dint matchn you entered", this.state.meeting_id)
            }
	   
        }
        disconnect = () => {
            console.log('disconnect function is called')
            this.pc.close();
            //this.state.localStream.getTracks().forEach(track => track.stop())
            if(this.state.remoteStream)
            {
              this.state.remoteStream.getTracks().forEach(track => track.stop())
              this.state.remoteStream = null;
            }
            if(this.state.localStream)
            {
              this.state.localStream.getTracks().forEach(track => track.stop())
              this.state.localStream = null;
            }
            if(this.pc)
            {
              this.pc.onaddstream = null;
              this.pc.onicecandidate = null;
              this.pc.close();
              this.pc = null;
            }
            this.candidates = [];
            this.createPc();
            this.setLocalVideo();
            this.setstream();
        }
        addCandidate = () => {
          // const candidate = JSON.parse(this.textref.value)
          console.log('Adding candidate:', candidate)
          this.candidates.forEach(candidate => {
            //console.log(JSON.stringify(candidate))
            this.pc.addIceCandidate(new RTCIceCandidate(candidate))
          })
        }
        accepted = () => {
        console.log('remote',this.candidates)
        	this.props.navigation.navigate('call', {remoteStream:this.state.remoteStream,localStream: this.state.localStream, pc : this.pc})
    	
	}
     
  render()
  {
    const {
      localStream,
      remoteStream,
      remoteBool
    } = this.state
    const { navigate } = this.props.navigation
    console.log(this.state.localStream)
    // if(!this.state.localStream){
    //   this.setLocalVideo();
    // }
    if(this.pc)
    {
    	console.log('signaling-State ',this.pc.signalingState)
    }
    const remoteVideo = localStream && remoteStream ?
      (
        <View style={{ padding: 15, }}>
          <Text style={{ fontSize:22, textAlign: 'center', color: 'black' }}>Call is on going ...{this.state.client_password}</Text>
        </View>
      ) :
      (
        <View style={{ padding: 15, }}>
          <Text style={{ fontSize:22, textAlign: 'center', color: 'black' }}>Waiting for Peer connection ...{this.state.client_password}</Text>
        </View>
      )
    return (
      <SafeAreaView style={{flex:1,flexDirection:'column',height:dimensions.height,width:dimensions.width,backgroundColor:'transparent'}}> 
      <SafeAreaView style={{flex:1,flexDirection:'row',alignItems:'flex-end'}}>
        <TextInput placeholder="Enter call ID" style={{flex:1,fontSize:30,backgroundColor:'transparent',borderBottomWidth:2,height:50,justifyContent:'center',margin:10}} onChangeText={(text) => this.setState({client_password: text})}/>
        </SafeAreaView>
        <SafeAreaView style={{flex:1,flexDirection:'row',margin:20}}>
        <TouchableOpacity style={{flex:1,borderRadius:30,borderWidth:2,height:40,alignItems:"center",margin:10}} onPress={this.createOffer}><Text style={{fontSize:25}}>call</Text></TouchableOpacity>
        <TouchableOpacity style={{flex:1,borderRadius:30,borderWidth:2,height:40,alignItems:"center",margin:10}} onPress={this.createAnswer}><Text style={{fontSize:25}}>answer</Text></TouchableOpacity>
        <TouchableOpacity style={{flex:1,borderRadius:30,borderWidth:2,height:40,alignItems:"center",margin:10}} onPress={() => {this.disconnect(); this.sendToPeer('disconnect-call', '');}}><Text style={{fontSize:25}}>cut</Text></TouchableOpacity>
        </SafeAreaView>
        <RTCView 
            key={2}
            objectFit='cover'
            style={{height:100,width:100}}
            streamURL={localStream && localStream.toURL()}
            />
         {remoteVideo}
      </SafeAreaView>
    );
  }
};
const Stack = createStackNavigator();
function MyStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator headerMode="none">
        <Stack.Screen  name="home" component={App}/>
        <Stack.Screen name="call" component={callScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default MyStack;
