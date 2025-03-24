const express = require('express');
const app = express();
require('dotenv').config();
const dbserver=require('./config')
const UserRouter=require('./routes/userRoutes');
const AdminRouter=require("./routes/adminRoutes")
const cartRouter=require("./routes/cartRoutes")
const Router=require("./routes/productRoutes")
const authMw=require('./middleware/AuthM');
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/user",UserRouter);
app.use("/user",AdminRouter);
app.use("/cart",cartRouter);
app.use("/product",authMw(),Router);

const PORT= process.env.PORT;
app.listen(PORT, async()=>{
    try{
        await dbserver();
        console.log(`server started on ${PORT}`)
    }catch(err){
        console.log("server failed to run...",err)
    }
})
//
