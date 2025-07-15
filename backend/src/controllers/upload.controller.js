import cloudinary from "../lib/cloudinary.js";

export const  uploadImage = async (req, res) => {
    try {
      const { uploadPic } = req.body;
  
      if (!uploadPic) {
        return res.status(400).json({ message: "Profile pic is required" });
      }
  
      const uploadResponse = await cloudinary.uploader.upload(uploadPic);
      
  
      res.status(200).json(uploadResponse.secure_url );
    } catch (error) {
      console.log("error in update upload image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };