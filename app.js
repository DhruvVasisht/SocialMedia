const express=require('express');
const app = express();
const connectToDB=require("./config/mongoose-connection")
require("dotenv").config();
const cookieParser = require('cookie-parser')
const userModel=require("./models/user")
const postModel=require("./models/post")
const bcrypt = require('bcrypt');
const jwt=require('jsonwebtoken');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(cookieParser());
connectToDB();

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post("/register", async (req, res) => {
  let {email,password,username, name ,age} = req.body 
  let user= await userModel.findOne({email});
  if(user) {
    return res.status(400).send("User already exists with this email");
  }
  bcrypt.genSalt(10,(err,salt)=>{
  bcrypt.hash(password, salt, async (err, hash) => {
      let user=await userModel.create({email,
        password: hash,
        username,
        name,
        age,
      });
      let token=jwt.sign({email, userid:user._id},process.env.SECRET_KEY);
      res.cookie("token",token);
      res.redirect("/login");
    });
  })

})

app.post("/login", async (req, res) => {
  let {email,password} = req.body 
  let user= await userModel.findOne({email});
  if(!user) {
    return res.status(500).send("Something went wrong");
  }
 bcrypt.compare(password, user.password,(err, result) => {
  if(result) {
    let token=jwt.sign({email, userid:user._id},process.env.SECRET_KEY);
    res.cookie("token",token);
    res.status(200).redirect("/profile")
   
  } 
  else {
    return res.redirect("/login");
  }
 })

})

app.get("/logout", async (req, res) => {
 res.cookie("token","")
 res.redirect("/login")

});

app.get("/profile",isLoggedIn, async (req, res) => {
 let user= await userModel.findOne({email: req.user.email}).populate("posts");
  res.render("profile",{user});
 
 });

 app.get("/like/:id",isLoggedIn, async (req, res) => {
  let post= await postModel.findOne({_id: req.params.id}).populate("user");

  if(post.likes.indexOf(req.user.userid)=== -1) {
    post.likes.push(req.user.userid);     
  }
  else {
    post.likes.splice(post.likes.indexOf(req.user.userid),1);     
  }

  await post.save();
   res.redirect("/profile");
  
  });


  app.get("/edit/:id",isLoggedIn, async (req, res) => {
    let post= await postModel.findOne({_id: req.params.id}).populate("user");
     res.render("edit",{post});
    
    });

    app.post("/update/:id",isLoggedIn, async (req, res) => {
      let post= await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content})
       res.redirect("/profile");
      
      });

 app.post("/post",isLoggedIn, async (req, res) => {
  let user= await userModel.findOne({email: req.user.email})
  let {content} = req.body
  let post = await postModel.create({
    user:user._id,
    content
  });
  
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
  
  });

function isLoggedIn(req, res,next) {
    let token = req.cookies.token;
    if (!token) return res.redirect("/login");
    else{
    let data =jwt.verify(token, process.env.SECRET_KEY);
    req.user=data;
    }
  
      next();
}

app.listen(3000, (req, res) => {
    console.log('Server is running on port 3000');
});