import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const uploadProfilePhoto = async (
  userId: string,
  file: File
): Promise<string> => {
  try {
    // Create file reference
    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `profile-photos/${userId}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
      },
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("File uploaded successfully:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error in uploadProfilePhoto:", error);
    throw error;
  }
};
