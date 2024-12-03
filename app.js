const express = require('express')
const app = express() 
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()




const port = process.env.PORT
const secretKey = process.env.JWT_KEY
const mongoDbURI = process.env.MONOGODB_URL

app.listen(port,()=>{
    console.log("port is running",port)
})

app.use(express.json({limit : '500mb'})) // Adjust the limit as needed
app.use(express.urlencoded({limit : '500mb' , extended : true}))



app.use(cors())


// connect to mongoose
mongoose.connect(mongoDbURI)
.then(()=>console.log('Mongodb Connected successfully!'))
.catch((err)=>console.log('Error found on mongodb connection: ',err))


// user information in schma
const Users = mongoose.model("user_information",{  // Model for Users
    id : {type : Number,required:true},
    username : {type : String , required : true},
    email : {type : String , required : true , unique : true ,set: value => value.toLowerCase()},
    password : {type : String , required : true},
    address : {type : String , required : true},
    isadmin : {type : Boolean , default : false}
})


 // product information in schma
const Products = new mongoose.Schema({

    id: {type:Number,required:true},
    name: {type:String,required:true,unique : true},
    description: {type:String,required:true},
    price: {type:Number,required:true},
    stock: {type:Number,required:true}
},{
     timestamps: true 
})
const Product_Model = mongoose.model('PRODUCTS',Products) // Model for Products_Model


// Schema for Orders
const OrdersSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    userId: { type: Number, required: true },  
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const Orders = mongoose.model('Orders', OrdersSchema); // model for Orders


// Schema for OrderItems within a Order
const OrderItemsSchema = new mongoose.Schema({
    orderId: { type: Number, required: true },   
    productId: { type: Number, required: true }, 
    price: { type: Number, required: true },    
    quantity: { type: Number, required: true },  
});
const OrderItems = mongoose.model('OrderItems', OrderItemsSchema); //Model for OrderItems


// Middleware for checking Admin user
const isAdmin = async (req, res, next) => {
    try {
        const reqtoken = req.header("Auth-Token")
        if (reqtoken){
            const data = jwt.verify(reqtoken, secretKey)
            if(!data){
                return res.send({success : false , message : "Invalid Data. Please login again."})
            }
            // Data validation
            const user = await Users.findOne({ email : data })
            if(user){
                if(user.isadmin === true){
                    return next()
                }
                else {
                    return res.send({ success: false, message: "Access denied. You don't have permission for this operation." });
                }
            } else{
                return res.send({ success: false, message: "User not found. Please login again."})
            } 
        }
        else{
            return res.send({success : false , message : "Auth token missing. Please login."})
        }
    } 
    catch(err){
        console.log("Error in isAdmin middleware:", err);
        return res.send({ success: false, message: "An error occurred. Please try again or contact the developer." });
    }
}


// Middleware for checking User login status
const isUSER = async (req, res, next)=>{
    try{
        const {id} = req.params
        const userToken = req.header('Auth-Token')
        if(userToken){
            const data = jwt.verify(userToken , secretKey)
            if(!data){
                return res.send({success : false , message :  "Invalid User. Please log in again."})
            }
            const userf = await Users.findOne({email : data })
            if(userf){
                if(id){
                    if(userf.id===Number(id)){
                        return next()
                    }
                    else{
                        return res.send({success : false , message : "The URL you are accessing is not available right now!"})
                    }
                }
                else{
                    return res.send({success : false , message : "Invalid URL! please try again with the correct one"})
                }
            }
            else{
                return res.send({success : false , message : "User not found. Please log in."})
            }
        }
        else{
            return res.send({success : false , message : "Auth token missing. Please log in."})
        }
    }
    catch(err){
        console.log("Error in user authentication:",err)
        return res.send({ success : false , message  : "An error occurred during user validation. Please contact the developer."})
    }
}


// Middleware for checking User Auth and Oder ID
const isOders = async (req, res, next) => {
    try {
        const token = req.header("Auth-Token")   //Token verify
        if (!token) {
            return res.send({ success: false, message: "Authentication token is missing. Please log in." })
        }
        const data = jwt.verify(token, secretKey)  // Verify token
        if (!data) {
            return res.send({ success: false, message: "Invalid token. Please log in again." })
        }
        const user = await Users.findOne({ email: data })  // Fetch user from database
        if (!user) {
            return res.send({ success: false, message: "User not found. Please log in." })
        }
        req.user = user  // Pass user data to the next middleware

        const { id } = req.params  // Check for optional order ID in params
        if (id) {
            const order = await Orders.findOne({ id: Number(id) })
            if (!order) {
                return res.send({ success: false, message: "Order not found." })
            }

            if (order.userId === user.id) { // This order belongs to the current user
                return next()
            }
            else{
                return res.send({ success: false, message: "Invalid Order ID! try again with the correct one." })
            }
        }
        else{
            // For bypassing Order creation API which doesnt have id parameter
            next()
        }
    }
    catch(err){
        console.error("Error in isOders middleware:", err);
        return res.send({ success: false, message: "An error occurred while validating the request. Please try again." });
    }
}


// API Endpoint for fetching all the available Products from the Database
  app.get('/All-products', async (req,res)=>{
    try
    {
        const isProduct = await Product_Model.find({})
        if(isProduct){
            return res.send({success: true , Products: isProduct})
        }
        else{
            return res.send({success: false ,message:"No products found. Please try again later."})
        }
    }

    catch(err)
    {
        console.log("Error fetching products:",err)
        return res.send({success : false ,message:"An error occurred while fetching products. Please contact the developer."})
    }
})


// API Endpoint to view single Product with its unique ID
app.get('/One-product/:id', async (req, res) => {
    try {
        const { id } = req.params
        const product = await Product_Model.findOne({ id: Number(id)})
        if (product) {
            return res.send({ success : true , Product : product })
        }
        else {
            return res.send({ success : false , message: "The product you're looking for is not available at this moment." })
        }
    } 
    catch(err){
        console.log("Error fetching product by ID:", err);
        return res.send({response: "not", message: "An error occurred while fetching the product. Please contact the developer."})
    }
})


//API endpoint for adding all products, accessible only by admins.
app.post('/Add-products-by-Admin',isAdmin, async (req,res)=>{
    try{
        let product = await Product_Model.find({})
        let id
        if (product.length !== 0){
            let lastproduct = product.slice(-1)
            let last = lastproduct[0]
            id = last.id+1
        }else{ 
          id = 1
        }
        const {name,description,price,stock}=req.body
        if(name&&description&&price&&stock){
            const isoneProduct = await Product_Model.findOne({name : name})
            if(isoneProduct){
                return res.send({success : false ,message: "Product with this name already exists. Please add a new product."})
            }
            const isaddProduct = new Product_Model({id : id,name : name,description : description,price : price,stock : stock})
            const issaveProduct = await isaddProduct.save()
            if(issaveProduct){
                return res.send({success : true ,message:"Product added successfully."})
            }
            else{
                return res.send({success : false ,message: "Failed to add product. Please try again."})
            }
        }
        else{
            return res.send({success : false , message:"All fields are required. Please provide valid product details."})
        }
    }
    catch(err){
        console.log("Error adding product:",err)
        return res.send({ success: false, message: "An error occurred while adding the product. Please contact the developer." });
    }
})

// API endpoint for updating products, accessible only by admins
app.put('/Update-Product-by-Admin/:id',isAdmin, async (req, res) => {
    try {
        const { id } = req.params 
        const { name,description,price,stock } = req.body
        console.log(name,description,price,stock)
        if (name&&description&&price&&stock) {
            const productToUpdate = await Product_Model.findOne({ id: Number(id) })
            if (productToUpdate){
                const updateResult = await Product_Model.updateOne({ id: Number(id) },{$set: { name: name, description : description,price: price, stock: stock}})
                if(updateResult.modifiedCount !== 0){
                    return res.send({success : true ,message: "Product updated successfully"})
                } 
                else{
                    return res.send({success : false ,message: "No changes made, please verify the input data"})
                }
            } 
            else{
                return res.send({success : false ,message: "Product not found"})
            }
        }
        else{
            return res.send({ success : false , message: "Missing required fields in the request body"})
        }
    } 
    catch(err){
        console.error("Error updating product:", err);
        return res.send({success : false , message: "Internal server error, please contact the developer"})
    }
})


// API endpoint for deleting a product, accessible only by admins.
app.delete('/Delete-Product-by-Admin/:id',isAdmin, async (req,res)=>{
    try{
        const {id}=req.params
        if(id){
            const isdeleteID = await Product_Model.findOne({id : Number(id)})
            if(isdeleteID){
                const IsDelete = await Product_Model.deleteOne({id: Number(id)})
                if(IsDelete.deletedCount > 0){
                    return res.send({success : true ,message:"Product deleted successfully"})
                }
                else{
                    return res.send({success : false ,message:"Failed to delete the product"})
                }
            }
            else{
                return res.send({success : false ,message:"Product not found"})
            }
        }
        else{
            return res.send({success : false ,message:"invalid id"})
        }
    }
    catch(err){
        console.log("Trouble Error to Delete",err)
        return res.send({success : false ,message:"Internal server error"})
    }
})


// API endpoint for creating a new user registration.
app.post('/Sigin', async (req,res)=>{
    try{
        let user = await Users.find({})
        let id;
        if (user.length>0){
            let last_product_array = user.slice(-1);
            let last_product = last_product_array[0];
            id = last_product.id+1;
        }else{ 
            id = 1
        }
        const {username,email,password,address}=req.body
        console.log(username,email,password,address)
        if(username&&email&&password&&address){
            const oneuser = await Users.findOne({email : email})
            if(oneuser){
                return res.send({success : false , message: "A user with this email already exists. Please use a different email to register." })
            }
            const newuser = new Users({id : id,username : username,email : email,password : password,address : address})
            const saveuser = await newuser.save()
            if(saveuser){
                return res.send({success : true,message:"User registered successfully."})
            }
            else{
                return res.send({success : false,message: "Registration failed. Please try again later." })
            }
        }
        else{
            return res.send({success : false,message:"All fields are required. Please provide complete user information."})
        }
    }
    catch(err){
        console.log("Error during user registration:",err)
        return res.send({success : false,message:"An error occurred during registration. Please contact the developer."})
    }
})


//API endpoint for user login
app.post('/Login', async (req,res)=>{
    try{
        const {email,password}=req.body
        console.log(email,password)
        if(email&&password){
            const checking = await Users.findOne({email : email})
            if(checking){
                if(checking.password===password){
                    console.log(checking)
                    const token = jwt.sign(checking.email,secretKey)
                    return res.send({success : true,message:"Login successful.",restoken : token})
                }
                else{
                    return res.send({success : false,message: "Incorrect password. Please try again."})
                }
            }
            else{
                return res.send({success : false,message:"Email not found. Please register first."})
            }
        }
        else{
            return res.send({success : false,message:"Email and password are required."})
        }
    }
    catch(err){
        console.log("Error during login:",err)
        return res.send({success : false,message:"An error occurred during login. Please contact the developer."})
    }
})


// API endpoint for viewing all users' data, accessible only by admins
app.get('/User-Data-by-Admin/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            const user = await Users.findOne({ id: id });
            if (user) {
                return res.send({ success: true, user: user });
            } else {
                return res.send({ success: false, message: "User not found. Please try again." });
            }
        } else {
            return res.send({ success: false, message: "Invalid user ID. Please provide a valid ID." });
        }
    } catch (err) {
        console.log("Error fetching user details:", err);
        return res.send({ success: false, message: "An error occurred while fetching user details. Please contact the developer." });
    }
});



// API endpoint for viewing individual user data with user authorization.
app.get('/User-data-by-User/:id', isUSER, async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            const user = await Users.findOne({ id: id });
            if (user) {
                return res.send({ success: true, user: user });
            } else {
                return res.send({ success: false, message: "User not found. Please try again." });
            }
        } else {
            return res.send({ success: false, message: "Invalid request, Please ensure you are on a valid url." });
        }
    }
    catch(err){
        console.log("Error fetching user details:", err);
        return res.send({ success: false, message: "An error occurred while fetching user details. Please contact the developer." });
    }
});


//API endpoint for updating user data, accessible only by admins.
app.put('/Update-User-Data-by-Admin/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, address } = req.body;
        if (id && username && email && password && address) {
            const user = await Users.findOne({ id: id });
            if (user) {
                const updatedUser = await Users.updateOne({ id: id }, { $set: {username: username,email: email,password: password,address: address }});
                if (updatedUser) {
                    return res.send({ success: true, message: "User details updated successfully." });
                } else {
                    return res.send({ success: false, message: "Failed to update user. Please try again." });
                }
            } else {
                return res.send({ success: false, message: "User not found. Please check the user ID." });
            }
        } else {
            return res.send({ success: false, message: "All fields are required. Please provide complete information." });
        }
    } 
    catch (err) {
        console.log("Error updating user:", err);
        return res.send({ success: false, message: "An error occurred while updating the user. Please contact the developer." });
    }
});


// API endpoint for updating individual data with user verification
app.put('/Upadte-User-Data-by-User/:id',isUSER, async (req,res)=>{
    try{
        const { id }=req.params
        const { username,email,password,address }=req.body
        if(id&&username&&email&&password&&address){
            const isoneuser = await Users.findOne({id : id})
            if(isoneuser){
                const isupuser = await Users.updateOne({id : id},{$set: {username : username,email : email,password : password,address : address
            }})
                if(isupuser){
                    return res.send({response:"ok",message:"User details updated successfully."})
                }
                else{
                    return res.send({response:"not",message:"Failed to update user. Please try again."})
                }
            }
            else{
                return res.send({response:"not",message:"User not found. Please check the user ID."})
            }
        }
        else{
            return res.send({response:"not",message:"All fields are required. Please provide complete information."})
        }
    }
    catch(err){
        console.log("Error updating user:",err)
        return res.send({response:"not",message:"An error occurred while updating the user. Please contact the developer."})
    }
})


//API endpoint for order placement with authentication
app.post('/Placing-Oders-by-User', isOders, async (req, res) => {
    try {
        const { items } = req.body; // Order items
        const { user } = req; // User data from middleware
        if (!items || items.length === 0) {
            return res.send({ success: false, message: "Please provide items to place the order." });
        }
        const lastOrder = await Orders.findOne({}).sort({ id: -1 });// Generate new order ID
        const newOrderId = lastOrder ? lastOrder.id + 1 : 1;
        let totalAmount = 0; 
        const orderItems = [];
        for (const item of items) {
            const product = await Product_Model.findOne({ id: item.productId });
            if (!product) {
                return res.send({ success: false, message: `Product ID ${item.productId} not found.` });
            }

            if (product.stock < item.quantity) {
                return res.send({ success: false, message: `Insufficient stock for Product ID ${item.productId}.` });
            }

            totalAmount += product.price * item.quantity;
            orderItems.push({
                orderId: newOrderId,
                productId: item.productId,
                price: product.price,
                quantity: item.quantity
            })
            // Update product stock
            await Product_Model.updateOne({ id: item.productId },{ $inc: { stock: -item.quantity } })
        }
        // Save the order
        const newOrder = new Orders({
            id: newOrderId,
            userId: user.id,
            totalAmount: totalAmount,
            status: 'placed'
        })
        await newOrder.save();
         // Save order items
        await OrderItems.insertMany(orderItems);
        return res.send({success: true,message: "Order placed successfully.",orderId: newOrderId,});
    } 
    catch(err){
        console.error("Error placing order:", err);
        return res.send({ success: false, message: "Internal server error. Please contact the developer." });
    }
});


//API endpoint for displaying user order history.
app.get('/History-Of-Orders-by-Admin', isAdmin, async (req, res) => {
    try {
        const orders = await Orders.find({});
        if (orders.length === 0) {
            return res.send({ success: false, message: "No orders found." });
        }
        // Populate each order with its corresponding items
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const items = await OrderItems.find({ orderId: order.id })
                return {
                    ...order.toObject(), // Convert Mongoose document to plain object
                    items,              // Attach items to the order
                }
            })
        )
        if (ordersWithItems) {
            return res.send({ success: true, message: "Your orders history.", data: ordersWithItems });
        } else {
            return res.send({ success: false, message: "Unable to retrieve your order history." });
        }
    } catch (err) {
        console.error("Trouble Error in fetching order history", err);
        return res.send({ success: false, message: "Internal server error. Please contact the developer." });
    }
})


//API endpoint for viewing a single order (admin access).
app.get('/One-Oder-by-Admin/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            const order = await Orders.findOne({ id: Number(id) });
            if (order) {
                const items = await OrderItems.find({ orderId: order.id });
                const orderWithItems = { ...order.toObject(), items };
                return res.send({ success: true, message: "Order details retrieved successfully.", singleorderwithitem: orderWithItems });
            } else {
                return res.send({ success: false, message: "Order not found. Please try again." });
            }
        } else {
            return res.send({ success: false, message: "Invalid order ID. Please try again." });
        }
    } catch (err) {
        console.error("Error fetching single order", err);
        return res.send({ success: false, message: "Error fetching order details. Please contact the developer." });
    }
});


//API endpoint for signing an order with user ID
app.get('/One-Oder-by-User/:id', isOders, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.send({ success: false, message: "Invalid order ID. Please try again." });
        }
        const order = await Orders.findOne({ id: Number(id) });
        if (!order) {
            return res.send({ success: false, message: "Order not found." });
        }
        const items = await OrderItems.find({ orderId: order.id });
        const orderWithItems = { 
            ...order.toObject(), items 
        }
        if(orderWithItems){
        return res.send({success: true, message: "your Order details showing successfully.",singleorderwithitem: orderWithItems})
        }
        else{
            return res.send({success : false , message : "Unable to fetch order items. Please try again later."})
        }
    }
    catch(err){
        console.error("Error fetching single order", err);
        return res.send({ success: false, message: "Error fetching order details. Please contact the developer." })
    }
})


//API endpoint for deleting an order with Admin middleware
app.delete('/Delete-Orders-by-Admin/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            const order = await Orders.findOne({ id: id });
            if (order) {
                // Delete the order items first
                await OrderItems.deleteMany({ orderId: order.id });
                // Delete the order
                await Orders.deleteOne({ id: id });
                return res.send({ success: true, message: "Order deleted successfully." });
            } else {
                return res.send({ success: false, message: "Order not found. Please try again." });
            }
        } else {
            return res.send({ success: false, message: "Invalid ID. Please check and try again." });
        }
    } catch (err) {
        console.log("Error deleting the order", err);
        return res.send({ success: false, message: "An error occurred while deleting the order. Please contact the developer." });
    }
})


//API endpoint for deleting an order with authentication
app.delete('/Delete-Order-by-User/:id', isOders, async (req, res) => {
    try {
        const { id } = req.params
        if(id){
            const order = await Orders.findOne({ id: id });
            if (order) {
                // Delete the order items first
                await OrderItems.deleteMany({ orderId: order.id });
                // Delete the order
                await Orders.deleteOne({ id: id });
                return res.send({ success: true, message: "Order deleted successfully." });
            }else{
                return res.send({ success: false, message: "Order not found. Please try again." });
            }
        }else{
            return res.send({ success: false, message: "Invalid ID. Please check and try again." });
        }
    } catch (err) {
        console.log("Error deleting the order", err);
        return res.send({ success: false, message: "An error occurred while deleting the order. Please contact the developer." });
    }
})



















