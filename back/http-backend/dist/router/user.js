"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const pclient = new client_1.PrismaClient();
exports.userRouter = (0, express_1.Router)();
const zod_1 = __importStar(require("zod"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_KEY = process.env.JWT_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRETE = process.env.CLIENT_SECRETE;
const sendemail = require("../otplogic/otp");
const otp_generator_1 = __importDefault(require("otp-generator"));
exports.userRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log("reached!!")
    try {
        const RequiredTypes = zod_1.default.object({
            googleId: (0, zod_1.string)().min(3).max(100),
            name: zod_1.default.string().min(3).max(100),
            email: zod_1.default.string().min(5).max(100).email(),
        });
        const CheckedRequiredTypes = RequiredTypes.safeParse(req.body);
        if (!CheckedRequiredTypes.success) {
            res.status(422).send("Invalid Input types");
            return;
        }
        const { name, email, googleId } = req.body;
        const CheckedByEmail = yield pclient.users.findUnique({
            where: {
                email: email
            }
        });
        if (CheckedByEmail) {
            res.json({
                message: "Email_exists"
            });
            return;
        }
        const PutUserIntoDB = yield pclient.users.create({
            data: {
                googleId: googleId,
                name: name,
                email: email,
                verified: false,
            }
        });
        const CreateOTP = otp_generator_1.default.generate(6, {
            digits: true, upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false
        });
        yield sendemail(email, "OTP-VERIFICATION", CreateOTP);
        const CreateOTPEntryInDB = yield pclient.otpmodel.create({
            data: {
                email: email,
                otp: CreateOTP
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: PutUserIntoDB.id
        }, JWT_KEY);
        res.cookie("userId", PutUserIntoDB.id, { httpOnly: false, secure: false });
        res.cookie("uidcookie", token, {
            httpOnly: false,
            secure: false
        });
        res.status(200).send("OTP_Send");
    }
    catch (e) {
        console.log(e);
        res.status(500).send("Something went Wrong!!!");
        return;
    }
}));
exports.userRouter.post("/logout", (req, res) => {
    res.clearCookie("uidcookie", {
        httpOnly: false, // Ensures the cookie cannot be accessed via JavaScript
        secure: true, // Ensures the cookie is only sent over HTTPS
    });
    res.clearCookie("userId", {
        httpOnly: false, // Ensures the cookie cannot be accessed via JavaScript
        secure: true, // Ensures the cookie is only sent over HTTPS
    });
    res.json({
        message: "logout"
    });
});
exports.userRouter.post("/verifyotp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.uidcookie;
    // console.log("here");
    if (!token) {
        res.json({
            message: "Not_SignedIn"
        });
        return;
    }
    const { otp, email } = req.body;
    const FindEmail = yield pclient.users.findUnique({
        where: {
            email
        }
    });
    if (!FindEmail) {
        res.json({
            message: "Not_found"
        });
        return;
    }
    // console.log("here also")
    const FindOTPInDB = yield pclient.otpmodel.findUnique({
        where: {
            otp
        }
    });
    if (!FindOTPInDB) {
        res.json({
            message: "Invalid_otp"
        });
        return;
    }
    const updateUser = yield pclient.users.update({
        where: {
            email: email
        },
        data: {
            verified: true
        }
    });
    const deleteOTPRecord = yield pclient.otpmodel.delete({
        where: {
            otp: otp
        }
    });
    res.json({
        message: "Verified!!"
    });
}));
exports.userRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("recieved");
    console.log(req.body);
    try {
        const RequiredTypes = zod_1.default.object({
            email: zod_1.default.string().min(5).max(100).email(),
        });
        const CheckedRequiredTypes = RequiredTypes.safeParse(req.body);
        if (!CheckedRequiredTypes.success) {
            res.status(422).send("Invalid_Input");
            return;
        }
        console.log("here also");
        const { email } = req.body;
        const CheckedByEmail = yield pclient.users.findUnique({
            where: {
                email: email
            }
        });
        if (!CheckedByEmail) {
            res.json({
                message: "not_found"
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: CheckedByEmail.id
        }, JWT_KEY);
        //  console.log(CheckedByEmail);
        res.cookie("userId", CheckedByEmail.id, { httpOnly: false, secure: false });
        res.cookie("uidcookie", token, {
            httpOnly: false,
            secure: false
        });
        res.json({
            data: CheckedByEmail
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Something went wrong!!");
        return;
    }
}));
exports.userRouter.get("/auths", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.uidcookie;
    if (!token) {
        res.json({
            message: "unauths"
        });
        return;
    }
    const user = yield pclient.users.findFirst({
        where: {
            id: req.cookies.userId
        }
    });
    res.json({
        message: "authenticated",
        userData: user
    });
}));
exports.userRouter.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.uidcookie;
    if (!token) {
        res.json({
            message: "Not_signedIn"
        });
        return;
    }
    const { roomname, userId } = req.body;
    try {
        const response = yield pclient.room.create({
            data: {
                slug: roomname,
                adminId: userId,
            }
        });
        res.json({
            roomId: response.id
        });
    }
    catch (e) {
        console.log("error");
        console.log(e);
    }
}));
exports.userRouter.post("/resend", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.uidcookie;
    if (!token) {
        res.json({
            message: "not_signedIn"
        });
        return;
    }
    const { email } = req.body;
    const deleteOTPRecord = yield pclient.otpmodel.delete({
        where: {
            email: email
        }
    });
    const CreateOTP = otp_generator_1.default.generate(6, {
        upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false
    });
    yield sendemail(email, "OTP-VERIFICATION", CreateOTP);
    const CreateOTPEntryInDB = yield pclient.otpmodel.create({
        data: {
            email: email,
            otp: CreateOTP
        }
    });
    res.json({
        message: "OTP_send_to_your_email"
    });
}));
exports.userRouter.post("/userrooms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //   console.log("yayaya   ")
        const token = req.cookies.uidcookie;
        if (!token) {
            res.json({
                message: "not_signedIn"
            });
            return;
        }
        const { userId } = req.body;
        // console.log(req);
        // console.log(userId);
        // console.log("user id is : "+userId)
        const userRooms = yield pclient.room.findMany({
            where: {
                adminId: userId
            }
        });
        //  console.log("hello");
        // console.log(userRooms)
        res.json({
            userRooms
        });
    }
    catch (error) {
        console.log(error);
    }
}));
exports.userRouter.get("/draw/:roomname", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("reached!!!");
    const roomname = req.params.roomname;
    const roomDetails = yield pclient.room.findUnique({
        where: {
            slug: roomname
        }
    });
    res.json({
        roomDetails
    });
}));
exports.userRouter.post("/shapesexits", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { roomId } = req.body;
    console.log("shapes reached!!!");
    console.log(roomId);
    const ExistingShapes = yield pclient.chats.findMany({
        where: {
            roomId: Number(roomId)
        }
    });
    res.json({
        ExistingShapes
    });
}));
exports.userRouter.delete("/delete/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("hereeee");
    try {
        const id = req.params.id;
        //fisrt delete all chats related to this roomID
        const CheckRoomExistWithChatOrNot = yield pclient.chats.findFirst({
            where: {
                roomId: Number(id)
            }
        });
        console.log("checked");
        console.log(CheckRoomExistWithChatOrNot);
        if (CheckRoomExistWithChatOrNot != null) {
            const deletedChat = yield pclient.chats.deleteMany({
                where: {
                    roomId: Number(id)
                }
            });
            if (deletedChat) {
                yield pclient.room.delete({
                    where: {
                        id: Number(id)
                    }
                });
            }
        }
        else {
            yield pclient.room.delete({
                where: {
                    id: Number(id)
                }
            });
        }
        res.json({
            message: "deleted"
        });
    }
    catch (error) {
        console.log("error are ::");
        console.log(error);
    }
}));
exports.userRouter.delete("/deletechat/:roomId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("delete reach!!!");
    const roomId = req.params.roomId;
    const CheckRoomExistWithChatOrNot = yield pclient.chats.findFirst({
        where: {
            roomId: Number(roomId)
        }
    });
    if (CheckRoomExistWithChatOrNot != null) {
        yield pclient.chats.deleteMany({
            where: {
                roomId: Number(roomId)
            }
        });
    }
    res.json({
        message: "Chat deleted successfully"
    });
}));
exports.userRouter.post("/api/auth/github", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("from backend github");
    const { userdata } = req.body;
    const email = userdata.email;
    const name = userdata.name;
    const uid = userdata.uid;
    const CheckedByEmail = yield pclient.users.findUnique({
        where: {
            email: email
        }
    });
    console.log("yaaahha");
    if (CheckedByEmail) {
        res.json({
            email,
            message: "Email_exists"
        });
        return;
    }
    const PutUserIntoDB = yield pclient.users.create({
        data: {
            githubId: uid,
            name: name,
            email: email,
            verified: false,
        }
    });
    const CreateOTP = otp_generator_1.default.generate(6, {
        digits: true, upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false
    });
    console.log("reached!!!");
    yield sendemail(email, "OTP-VERIFICATION", CreateOTP);
    try {
        const CreateOTPEntryInDB = yield pclient.otpmodel.create({
            data: {
                email: email,
                otp: CreateOTP
            }
        });
    }
    catch (error) {
        console.log("otp error", error);
    }
    console.log("created entry aslo");
    const token = jsonwebtoken_1.default.sign({
        userId: PutUserIntoDB.id
    }, JWT_KEY);
    res.cookie("userId", PutUserIntoDB.id, { httpOnly: false, secure: false });
    res.cookie("uidcookie", token, {
        httpOnly: false,
        secure: false
    });
    res.json({
        userData: PutUserIntoDB
    });
}));
exports.userRouter.post("/api/auth/facebook", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("facebook");
    const { userdata } = req.body;
    const email = userdata.email;
    const name = userdata.name;
    const uid = userdata.uid;
    const CheckedByEmail = yield pclient.users.findUnique({
        where: {
            email: email
        }
    });
    console.log("email mil gaya", email);
    if (CheckedByEmail) {
        res.json({
            email,
            message: "Email_exists"
        });
        return;
    }
    const PutUserIntoDB = yield pclient.users.create({
        data: {
            githubId: uid,
            name: name,
            email: email,
            verified: false,
        }
    });
    const CreateOTP = otp_generator_1.default.generate(6, {
        digits: true, upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false
    });
    console.log("reached!!!");
    yield sendemail(email, "OTP-VERIFICATION", CreateOTP);
    try {
        const CreateOTPEntryInDB = yield pclient.otpmodel.create({
            data: {
                email: email,
                otp: CreateOTP
            }
        });
    }
    catch (error) {
        console.log("otp error", error);
    }
    console.log("created entry aslo");
    const token = jsonwebtoken_1.default.sign({
        userId: PutUserIntoDB.id
    }, JWT_KEY);
    res.cookie("userId", PutUserIntoDB.id, { httpOnly: false, secure: false });
    res.cookie("uidcookie", token, {
        httpOnly: false,
        secure: false
    });
    res.json({
        userData: PutUserIntoDB
    });
}));
exports.userRouter.get("/check", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("here in check 1");
    console.log("kyu nahi aa rha ");
    const email = String(req.query.email);
    console.log(email);
    console.log("here in check 2");
    const response = yield pclient.users.findUnique({
        where: {
            email: email
        }
    });
    console.log(response);
    if ((response === null || response === void 0 ? void 0 : response.verified) === true) {
        res.json({
            message: "found"
        });
    }
    else {
        res.json({
            message: "not_found"
        });
    }
}));
