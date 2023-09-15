const express = require('express')
// const router = express.Router()
const router = express()
const bodyParser = require('body-parser')
 
const session = require('express-session')
const {SESSION_SECRET} = process.env
// router.use(session({secret:SESSION_SECRET}))

router.use(session({
    secret: SESSION_SECRET,
    resave: false, // Set to false to avoid the deprecation warning
    saveUninitialized: true, // Set to true to avoid the deprecation warning
    // Additional session options go here
  }));

const cookieParser = require('cookie-parser')
router.use(cookieParser())

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({extended:true}))

router.set('view engine','ejs')
router.set('views','./views')

router.use(express.static('public'))

const path = require('path')
const multer = require('multer')

const storage = multer.diskStorage({
    destination:function(req, file, cb){
        cb(null, path.join(__dirname,'../public/images'));
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null, name)
    }
})

const upload = multer({storage:storage})

const userController = require('../controllers/userController')

const auth = require('../middlewares/auth')

router.get('/register',  auth.isLogout, userController.registerLoad)
router.post('/register', upload.single('image'),userController.register)

router.get('/', auth.isLogout, userController.loadLogin)
router.post('/', userController.login)
router.get('/logout',  auth.isLogin, userController.logout)

router.get('/dashboard', auth.isLogin, userController.loadDashboard)
router.post('/save-chat', userController.saveChat)

router.post('/delete-chat', userController.deleteChat)
router.post('/update-chat', userController.updateChat)

router.get('/groups', auth.isLogin, userController.loadGroups)
router.post('/groups', upload.single('image'), userController.createGroup)

router.post('/get-members', auth.isLogin, userController.getMembers)
router.post('/add-members', auth.isLogin, userController.addMembers)

router.post('/update-chat-group', auth.isLogin, upload.single('image'), userController.updateChatGroup)
router.post('/delete-chat-group', auth.isLogin, userController.deleteChatGroup)
router.get('/share-group/:id', userController.shareGroup)
router.post('/join-group', userController.joinGroup)
router.get('/group-chat', auth.isLogin, userController.groupChats)

router.post('/group-chat-save', userController.saveGroupChat)
router.post('/load-group-chats', userController.loadGroupChats)
router.post('/delete-group-chat', userController.deleteGroupChat)
router.post('/update-group-chat', userController.updateGroupChat)

router.get('*', function(req,res){
    res.redirect('/')
})
module.exports = router