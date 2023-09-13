const userModel = require('../models/userModel')
const chatModel = require('../models/chatModel')
const groupModel = require('../models/groupModel')
const memberModel = require('../models/memberModel')
const groupChatModel = require('../models/groupChatModel')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const registerLoad = async function(req,res){
    try{
        
        res.render('register')

    }catch(error){
        console.log(error.message)
    }
}

const register = async function(req,res){
    try{
       const passwordHash = await bcrypt.hash(req.body.password, 10)
       const user = new userModel({
        name: req.body.name,
        email: req.body.email,
        image: 'images/'+req.file.filename,
        password: passwordHash
       })
       await user.save()
       res.render('register',{message: 'You have registered successfully!'})
    }catch(error){
        console.log(error.message)
    }
}

const loadLogin = async function(req,res){
    try{
        res.render('login')
    }catch(error){
        console.log(error.message);
    }
}

const login = async function(req,res){
    try{
        const email = req.body.email
        const password = req.body.password

        const userData = await userModel.findOne({email:email})
        if(userData){
          const passwordMatch = await bcrypt.compare(password, userData.password)
          if(passwordMatch){
            req.session.user = userData
            res.cookie('user', JSON.stringify(userData))
            res.redirect('/dashboard')
          }
        
        else{
            res.render('login',{message:'Email and Password is InValid!'})
        }
    }
    }catch(error){
        console.log(error.message);
    }
}

const logout = async function(req,res){
    try{
        res.clearCookie('user')
        req.session.destroy()
        res.redirect('/')
    }catch(error){
        console.log(error.message);
    }
}

const loadDashboard = async function(req,res){
    try{
        let users = await userModel.find({_id:{$nin:[req.session.user._id]}})
        res.render('dashboard',{user:req.session.user, users:users})
    }catch(error){
        console.log(error.message)
    }
}

const saveChat = async function(req,res){
    try{
        let chat = new chatModel({
            sender_id:req.body.sender_id,
            receiver_id:req.body.receiver_id,
            message:req.body.message
        })
        let newChat = await chat.save()
        res.status(200).send({success:true, msg: 'Chat inserted', data: newChat})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const deleteChat = async function(req, res){
    try{
        await chatModel.deleteOne({_id:req.body.id})
        res.status(200).send({sucess:true })
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const updateChat = async function(req, res){
    try{
        await chatModel.findByIdAndUpdate({_id:req.body.id}, {
            $set:{message:req.body.message}
        })
        res.status(200).send({sucess:true })
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

 const loadGroups = async function(req, res){
    try{
        const groups = await groupModel.find({creator_id:req.session.user._id})
        res.render('group',{groups:groups})
    }catch(error){
        console.log(error.message)
    }
}

const createGroup = async function(req, res){
    try{
        const group = new groupModel({
            creator_id:req.session.user._id,
            name:req.body.name,
            image:'images/'+req.file.filename,
            limit: req.body.limit
        });
        await group.save()

        const groups = await groupModel.find({creator_id:req.session.user._id})

        res.render('group',{message:req.body.name+' Group created successfully!', groups:groups})
    }catch(error){
        console.log(error.message)
    }
}

const getMembers = async function(req, res){
    try{
       var users =  await userModel.aggregate([
        {
            $lookup:{
                from:"members",
                localField:"_id",
                foreignField:"user_id",
                pipeline:[
                    {
                        $match:{
                            $expr:{
                                $and:[
                                    { $eq:[ "$group_id", mongoose.Types.ObjectId(req.body.group_id) ]}
                                ]
                            }
                        }
                    }
                ],
                as:"member"
            }
        },
        {
            $match:{
                "_id":{
                    $nin:[mongoose.Types.ObjectId(req.session.user._id)]
                }
            }
        }
       ])
   
        res.status(200).send({sucess:true,data:users })
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

 const addMembers = async function(req, res){
    try{
      if(!req.body.members){
        res.status(200).send({sucess:false, msg:'Please select any one Member'})
      }
      else if(req.body.members.length > parseInt(req.body.limit)){
        res.status(200).send({sucess:false, msg:'You can not select more than '+req.body.limit+' Members' })
    }
    else{
        
        await memberModel.deleteMany({group_id:req.body.group_id});

        var data = []
        const members = req.body.members;
        for(let i=0; i<members.length; i++){
            data.push({
                group_id:req.body.group_id,
                user_id:members[i]
            });
           
        }
        await memberModel.insertMany(data)
        res.status(200).send({sucess:true,msg:'Members added successfully!' })
    }
    
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const updateChatGroup = async function(req, res){
    try{

        if(parseInt(req.body.limit) < parseInt(req.body.last_limit)){
            await memberModel.deleteMany({group_id: req.body.id});
        }
        var updateObj;
        if(req.file != undefined){
            updateObj ={
                name: req.body.name,
                image: 'images/'+req.file.filename,
                limit: req.body.limit,
            }
        }
        else{
            updateObj ={
                name: req.body.name,
                limit: req.body.limit,
            }
        }

        await groupModel.findByIdAndUpdate({_id: req.body.id}, {
            $set: updateObj
        })
        res.status(200).send({sucess:true,msg:'Chat Group Updated Successfully!' })
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const deleteChatGroup = async function(req, res){
    try{
        await groupModel.deleteOne({_id:req.body.id});
        await memberModel.deleteMany({group_id:req.body.id});
        res.status(200).send({sucess:true,msg:'Chat Group Deleted Successfully!' })
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const shareGroup = async function(req, res){
    try{
        var groupData = await groupModel.findOne({_id: req.params.id})
        if(!groupData){
            res.render('error', {message: '404 not found!'})
        }
        else if(req.session.user == undefined){
            res.render('error', {message: 'You need to login to access the Share URL!'})
        }
        else{
            var totalMembers = await memberModel.find({group_id: req.params.id}).count();
            var available = groupData.limit - totalMembers;
            var isOwner = groupData.creator_id == req.session.user._id ? true : false;
            var isJoined = await memberModel.find({group_id: req.params.id, user_id: req.session.user._id}).count();
            res.render('shareLink', {group: groupData, available: available, totalMembers: totalMembers, isOwner: isOwner, isJoined: isJoined} )
        }
    }catch(error){
         console.log(error.message);
    }
}

const joinGroup = async function(req, res){
    try{
        const member = new memberModel({
            group_id:req.body.group_id,
            user_id:req.session.user_id
        });
        await member.save()
        res.status(200).send({success:true, msg: 'Congratulation, you have Joined the Group Successfully!'})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const groupChats = async function(req, res){
    try{
        const myGroups = await groupModel.find({creator_id:req.session.user._id})
        const joinedGroups = await memberModel.find({user_id:req.session.user._id}).populate('group_id')
        res.render('chat-group',{myGroups:myGroups, joinedGroups:joinedGroups})
    }catch(error){
        console.log(error.message)
    }
}

const saveGroupChat = async function(req, res){
    try{
        var chat = new groupChatModel({
            sender_id:req.body.sender_id,
            group_id:req.body.group_id,
            message:req.body.message
        });
        var newChat = await chat.save();
        var cChat = await groupChatModel.findOne({_id:newChat._id}).populate('sender_id')
        res.status(200).send({success:true, chat:cChat})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const loadGroupChats = async function(req, res){
    try{
        const groupChats = await groupChatModel.find({group_id:req.body.group_id}).populate('sender_id')
        res.status(200).send({success:true, chats:groupChats})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const deleteGroupChat = async function(req, res){
    try{
        await groupChatModel.deleteOne({_id:req.body.id})
        res.status(200).send({success:true, msg:'Chat Deleted'})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

const updateGroupChat = async function(req, res){
    try{
        await groupChatModel.findByIdAndUpdate({_id:req.body.id}),{
        $set:{
            message:req.body.message
        }
        }
        res.status(200).send({success:true, msg:'Chat Updated'})
    }catch(error){
        res.status(400).send({success:false, msg: error.message})
    }
}

module.exports = {registerLoad,
    register,
    loadLogin,
    login,
    logout,
    loadDashboard,
    saveChat,
    deleteChat,
    updateChat,
    loadGroups,
    createGroup,
    getMembers,
    addMembers,
    updateChatGroup,
    deleteChatGroup,
    shareGroup,
    joinGroup,
    groupChats,
    saveGroupChat,
    loadGroupChats,
    deleteGroupChat,
    updateGroupChat
}