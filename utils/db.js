import mongoose from "mongoose";

/**
 * Connect to the MongoDB database
 */
export const connect_to_db = async () => {
  try {
    // Log environment and startup info for debugging
    console.log("DB bootstrap: MONGODB_URI=", process.env.MONGODB_URI);
    console.log("DB bootstrap: MONGODB_DBNAME=", process.env.MONGODB_DBNAME);
    console.log("DB bootstrap: NODE_ENV=", process.env.NODE_ENV);

    console.log("Attempting mongoose.connect()...");
    // Connect to the MongoDB database using the MONGODB_URI and MONGODB_DBNAME environment variables
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DBNAME,
    });

    console.log("mongoose.connect() completed");

    // Log a message when successfully connected to the MongoDB database
    mongoose.connection.on("connected", () => {
      console.log("Connected to MongoDB");
      console.log(
        "mongoose connection readyState:",
        mongoose.connection.readyState,
      );
    });

    // Log when the connection errors
    mongoose.connection.on("error", (err) => {
      console.log("Error connecting to MongoDB", err);
    });

    // Additional lifecycle logs
    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("Mongoose reconnected");
    });
  } catch (error) {
    // Log an error message if there is an error connecting to the MongoDB database
    console.log("Error connecting to MongoDB", error);
  }
};
