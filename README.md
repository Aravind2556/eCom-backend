# Node.js Application

This is a Node.js application that uses environment variables for secure configuration of sensitive data like database credentials and secret keys.

---

## Environment Variables

The application requires the following environment variables to be set up in a `.env` file:

| Variable Name      | Description                                             |
|--------------------|---------------------------------------------------------|
| `PORT`             | The port for which the project is to be run             |
| `JWT_KEY`          | The secret key used for JWT authentication.             |
| `MONOGODB_URL`     | The MongoDB connection URI for accessing the database.  |

### Example `.env` File

Create a `.env` file in the root of your project and add the following content:

PORT=prefered port to run this project
JWT_KEY=your_secret_key
MONOGODB_URL=your_mongodb_connection_uri



---------------------------------------------------------------------------------------------------------------------------------------------------

## Steps for Installation and Running this Project:
- Instructions to install dependencies using `npm install`.
- Steps to run the application using `node app.js`.
- Admin Enabling admin user - By default all users admin roles will be set to false, So update the required user's admin role to true


