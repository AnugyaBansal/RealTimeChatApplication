require('dotenv').config()
const express = require('express')
const route = require('./routes/route')
const mongoose = require('mongoose')

// const multer = require('multer')
const app = express()
app.use(express.json())
// app.use(multer().any())

mongoose.connect("mongodb+srv://RealTimeChat01:QPXvgG7yQTFqOAUl@cluster0.umkd9fi.mongodb.net/", {
    useNewUrlParser: true
})
.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )

const userModel = require('./models/userModel')
const chatModel = require('./models/chatModel')

const http = require('http').Server(app)
app.use('/', route)
const io = require('socket.io')(http)

const usp = io.of('/user-namespace')
usp.on('connection', async function(socket){
    console.log('User Connected')

    let userId = socket.handshake.auth.token
    await userModel.findByIdAndUpdate({_id:userId}, {$set:{is_online:'1'}})
    
    //user broadcast online status
    socket.broadcast.emit('getOnlineUser', {user_id:userId })

    socket.on('disconnect', async function(){
        console.log('User Disconnected');

        let userId = socket.handshake.auth.token
    await userModel.findByIdAndUpdate({_id:userId}, {$set:{is_online:'0'}})
        
    //user broadcast offline status
    socket.broadcast.emit('getOfflineUser', {user_id:userId })

    })

    //chatting implementation
    socket.on('newChat', function(data){
        socket.broadcast.emit('loadNewChat', data)
    })

    //load old chats
    socket.on('existsChat', async function(data){
        let chats = await chatModel.find({$or:[
            {sender_id:data.sender_id, receiver_id:data.receiver_id},
            {sender_id:data.receiver_id, receiver_id:data.sender_id}
        ]})
        socket.emit('loadChats', {chats:chats})
    })

    //delete chats
    socket.on('chatDeleted', function(id){
        socket.broadcast.emit('chatMessageDeleted', id);
    })
    //update chats
    socket.on('chatUpdated', function(data){
        socket.broadcast.emit('chatMessageUpdated', data);
    })

    //new group chat added
    socket.on('newGroupChat', function(data){
        socket.broadcast.emit('loadNewGroupChat', data); //broadcast group chat object
    });

    socket.on('groupChatDeleted',function(id){
        socket.broadcast.emit('groupChatMessageDeleted', id); //broadcast chat deleted id
    })

    socket.on('groupChatUpdated', function(data){
        socket.broadcast.emit('groupChatMessageUpdated', data);
    })
})
http.listen(3000, function(){
    console.log('Server is running')
})