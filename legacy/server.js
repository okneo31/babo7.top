const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { createClient } = require("redis");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = 'babo_secret_key_v1_final';
const ADMIN_ID = 'admin';
const ADMIN_PW = 'babo1234';

// 유니코드 정규화 헬퍼: iOS/맥(NFD 조합형)과 안드/윈도우(NFC 완성형)의 한글 입력을
// 동일한 형태(NFC)로 통일해 닉네임/아이디 매칭·저장이 기기와 무관하게 일치하도록 한다.
const nfc = (s) => (typeof s === 'string' ? s.normalize('NFC') : s);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.post('/api/upload', (req, res) => {
    try {
        const filename = req.query.name || 'unknown_file';
        const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
        const safeName = Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
        const destPath = path.join(uploadDir, safeName);
        const mimeType = req.headers['content-type'] || 'application/octet-stream';

        const writeStream = fs.createWriteStream(destPath);
        req.pipe(writeStream);

        writeStream.on('finish', () => { res.json({ success: true, file: { url: '/uploads/' + safeName, name: filename, type: mimeType } }); });
        writeStream.on('error', (err) => { console.error('File write error:', err); if (!res.headersSent) res.status(500).json({ success: false, message: '파일 저장 실패' }); });
        req.on('error', (err) => { console.error('Upload stream error:', err); writeStream.destroy(); if (!res.headersSent) res.status(500).json({ success: false, message: '업로드 연결 끊김' }); });
    } catch (error) {
        console.error('Upload Error:', error); if (!res.headersSent) res.status(500).json({ success: false, message: '서버 오류' });
    }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const redisClient = createClient({ url: 'redis://redis:6379' });
redisClient.on('error', (err) => console.log('Redis Error', err));
redisClient.connect().then(() => console.log("🔥 Redis 연결 성공!"));

const UserSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, nickname: { type: String, required: true }, isAdmin: { type: Boolean, default: false }, friends: [{ type: String }] });
const User = mongoose.model('User', UserSchema);

const RoomSchema = new mongoose.Schema({ roomId: { type: String, required: true, unique: true }, name: { type: String, required: true }, type: { type: String, enum: ['public', 'secret', 'channel', 'dm'], default: 'public' }, owner: { type: String, required: true }, members: [{ type: String }], createdAt: { type: Date, default: Date.now } });
const Room = mongoose.model('Room', RoomSchema);

const MessageSchema = new mongoose.Schema({ roomId: { type: String, required: true }, user: { type: String, required: true }, text: { type: String, default: '' }, file: { type: Object, default: null }, readBy: { type: [String], default: [] }, isEdited: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } });
const Message = mongoose.model('Message', MessageSchema);

const NoticeSchema = new mongoose.Schema({ text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } });
const Notice = mongoose.model('Notice', NoticeSchema);

mongoose.connect('mongodb://mongo:27017/babotalk')
    .then(async () => { 
        console.log("🍃 MongoDB 연결 성공!");
        const adminExists = await User.findOne({ username: ADMIN_ID });
        if (!adminExists) {
            const hashed = await bcrypt.hash(ADMIN_PW, 10);
            await new User({ username: ADMIN_ID, password: hashed, nickname: '관리자', isAdmin: true, friends: [] }).save();
            console.log("👑 DB에 관리자(admin) 계정이 자동 생성되었습니다.");
        }
    })
    .catch(err => console.error(err));

app.post('/api/login', async (req, res) => {
    const username = nfc(req.body.username); const { password } = req.body;
    if (username === ADMIN_ID && password === ADMIN_PW) { const token = jwt.sign({ id: 'admin', nickname: '관리자', username: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '1d' }); return res.json({ success: true, token, nickname: '관리자', username: 'admin', isAdmin: true }); }
    try {
        const user = await User.findOne({ username }); if (!user) return res.json({ success: false, message: '아이디 없음' });
        const isMatch = await bcrypt.compare(password, user.password); if (!isMatch) return res.json({ success: false, message: '비밀번호 틀림' });
        const token = jwt.sign({ id: user._id, nickname: user.nickname, username: user.username, isAdmin: false }, JWT_SECRET, { expiresIn: '7d' }); res.json({ success: true, token, nickname: user.nickname, username: user.username, isAdmin: false });
    } catch (e) { res.status(500).json({ success: false, message: '서버 오류' }); }
});

app.post('/api/register', async (req, res) => { const { inviteCode, password } = req.body; const username = nfc(req.body.username); const nickname = nfc(req.body.nickname); if(username.toLowerCase() === 'admin') return res.json({ success: false, message: '관리자 ID 불가' }); const isValid = await redisClient.get(`invite:${inviteCode}`); if (!isValid && inviteCode !== 'MASTER_KEY') return res.json({ success: false, message: '초대코드 오류' }); if (await User.findOne({ username })) return res.json({ success: false, message: '중복 ID' }); const hashedPassword = await bcrypt.hash(password, 10); await new User({ username, password: hashedPassword, nickname }).save(); if (inviteCode !== 'MASTER_KEY') await redisClient.del(`invite:${inviteCode}`); res.json({ success: true }); });
app.post('/api/friends', async (req, res) => { const user = await User.findOne({ username: nfc(req.body.username) }); if (!user) return res.json([]); const friends = await User.find({ username: { $in: user.friends } }, 'username nickname'); res.json(friends); });
app.post('/api/add-friend', async (req, res) => { const myUsername = nfc(req.body.myUsername); const friendId = nfc(req.body.friendId); const friend = await User.findOne({ $or: [{ username: friendId }, { nickname: friendId }] }); if (!friend) return res.json({ success: false, message: '존재하지 않는 아이디 또는 닉네임입니다.' }); if (myUsername === friend.username) return res.json({ success: false, message: '자신을 친구로 추가할 수 없습니다.' }); const user = await User.findOne({ username: myUsername }); if (!user) return res.json({ success: false, message: '로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.' }); if (user.friends.includes(friend.username)) return res.json({ success: false, message: '이미 추가된 친구입니다.' }); user.friends.push(friend.username); await user.save(); res.json({ success: true, message: '친구 추가 완료!' }); });

app.post('/api/dm-room', async (req, res) => {
    const myNick = nfc(req.body.myNick); const friendNick = nfc(req.body.friendNick);
    const sorted = [myNick, friendNick].sort(); 
    const hash = Buffer.from(sorted.join('_')).toString('hex').substring(0, 16); 
    const roomId = 'DM_' + hash; 
    
    let room = await Room.findOne({ roomId }); 
    if (!room) { 
        room = await new Room({ roomId, name: '1:1 대화', type: 'dm', owner: myNick, members: [myNick, friendNick] }).save(); 
    } else { 
        if (room.type !== 'dm') { room.type = 'dm'; }
        if (!room.members.includes(myNick)) room.members.push(myNick); 
        if (!room.members.includes(friendNick)) room.members.push(friendNick); 
        await room.save(); 
    } 
    res.json({ success: true, roomId, roomName: friendNick }); 
});

app.post('/api/invite', async (req, res) => { const code = Math.random().toString(36).substring(2, 8).toUpperCase(); await redisClient.set(`invite:${code}`, 'valid', { EX: 86400 }); res.json({ code }); });

app.post('/api/rooms', async (req, res) => {
    try {
        const nickname = nfc(req.body.nickname);
        const rooms = await Room.find({ $or: [{ type: 'public' }, { type: 'channel' }, { members: nickname }] }).lean();
        for (let r of rooms) {
            r.unread = await Message.countDocuments({ roomId: r.roomId, readBy: { $ne: nickname } });
            const lastMsg = await Message.findOne({ roomId: r.roomId }).sort({ createdAt: -1 });
            r.lastMsgText = lastMsg ? (lastMsg.isDeleted ? '🚫 삭제된 메시지' : (lastMsg.text || (lastMsg.file ? '📁 첨부파일' : ''))) : '';
            r.lastMsgTime = lastMsg ? lastMsg.createdAt : r.createdAt;
        }
        rooms.sort((a, b) => new Date(b.lastMsgTime) - new Date(a.lastMsgTime));
        res.json(rooms); 
    } catch (e) { res.json([]); } 
});

app.post('/api/create-room', async (req, res) => { const { type, name, customId } = req.body; const owner = nfc(req.body.owner); const invitees = Array.isArray(req.body.invitees) ? req.body.invitees.map(nfc) : req.body.invitees; if (type === 'secret' && (!customId || customId.trim() === '')) return res.json({ success: false, message: '비밀방은 방 코드를 필수로 입력해야 합니다.' }); let roomId = customId ? customId.toUpperCase().replace(/[^A-Z0-9]/g, '') : Math.random().toString(36).substring(2, 8).toUpperCase(); if(roomId.length < 2) return res.json({ success: false, message: '방 코드는 2글자 이상이어야 합니다.' }); if(await Room.findOne({ roomId })) return res.json({ success: false, message: '이미 사용 중인 방 코드입니다.' }); let initialMembers = [owner]; if (invitees && Array.isArray(invitees)) { initialMembers = [...new Set([...initialMembers, ...invitees])]; } await new Room({ roomId, name, type, owner, members: initialMembers }).save(); res.json({ success: true, roomId }); });

app.post('/api/join-room', async (req, res) => { 
    const { roomId } = req.body; const nickname = nfc(req.body.nickname);
    const room = await Room.findOne({ roomId });
    if (!room) return res.json({ success: false, message: '존재하지 않는 방 코드입니다.' });
    if (room.type === 'dm' || room.roomId.startsWith('DM_')) return res.json({ success: false, message: '🔒 1:1 대화방은 코드로 난입할 수 없습니다.' }); 
    if (!room.members.includes(nickname)) { room.members.push(nickname); await room.save(); } 
    res.json({ success: true, name: room.name, owner: room.owner }); 
});

app.post('/api/search-chat', async (req, res) => { const msgs = await Message.find({ roomId: req.body.roomId, text: { $regex: req.body.keyword, $options: 'i' }, isDeleted: false }).sort({ createdAt: -1 }).limit(20); res.json(msgs); });
app.post('/api/admin/stats', async (req, res) => { res.json({ userCount: await User.countDocuments(), totalRooms: await Room.countDocuments() }); });
app.post('/api/admin/broadcast', async (req, res) => { await Notice.deleteMany({}); const newNotice = await new Notice({ text: req.body.message }).save(); io.emit('admin_notice', { id: newNotice._id, text: newNotice.text }); res.json({ success: true }); });
app.post('/api/admin/reset', async (req, res) => { if(req.body.confirm !== 'CONFIRM_NUKE') return res.json({ success: false }); await Room.deleteMany({}); await Message.deleteMany({}); await User.deleteMany({}); await Notice.deleteMany({}); if (fs.existsSync(uploadDir)) { fs.readdirSync(uploadDir).forEach(f => fs.unlinkSync(path.join(uploadDir, f))); } io.emit('system_reset'); res.json({ success: true }); });

async function destroyRoomAndFiles(roomId) { const msgs = await Message.find({ roomId }); msgs.forEach(msg => { if (msg.file && msg.file.url) { const filePath = path.join(__dirname, 'public', msg.file.url); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } }); await Message.deleteMany({ roomId }); await Room.deleteOne({ roomId }); }

io.on('connection', async (socket) => {
    const latestNotice = await Notice.findOne().sort({ createdAt: -1 });
    if (latestNotice) { socket.emit('admin_notice', { id: latestNotice._id, text: latestNotice.text }); }

    socket.on('join_room', async ({ roomId, nickname: rawNick }) => {
        const nickname = nfc(rawNick);
        socket.join(roomId); socket.roomId = roomId; socket.nickname = nickname;
        let room = await Room.findOne({ roomId }); 
        const isOwner = (room && room.owner === nickname); 
        const isAdmin = (nickname === '관리자'); 
        socket.emit('set_role', { isOwner: isOwner || isAdmin, roomType: room ? room.type : 'public' }); 
        if (room && !room.members.includes(nickname)) { room.members.push(nickname); await room.save(); }
        await Message.updateMany({ roomId, readBy: { $ne: nickname } }, { $addToSet: { readBy: nickname } });
        const history = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(100); 
        socket.emit('room_history', { msgs: history, members: room ? room.members : [] }); 
        socket.to(roomId).emit('user_read_all', { nickname });
    });

    socket.on('msg', async (data) => { 
        const targetRoom = socket.roomId || data.roomId; 
        const targetNick = socket.nickname || nfc(data.nickname);
        if (!targetRoom || !targetNick) return; 

        const room = await Room.findOne({ roomId: targetRoom });
        if (room && room.type === 'channel') {
            if (room.owner !== targetNick && targetNick !== '관리자') return; 
        }
        
        const newMsg = await new Message({ roomId: targetRoom, user: targetNick, text: data.text || '', file: data.file, readBy: [targetNick] }).save(); 
        io.to(targetRoom).emit('msg', newMsg); 
    });

    socket.on('request_history', async ({ roomId }) => { const room = await Room.findOne({ roomId }); const history = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(100); socket.emit('update_history_silently', { msgs: history, members: room ? room.members : [] }); });
    socket.on('read_msg', async ({ msgId, nickname: rawNick }) => { const nickname = nfc(rawNick); const msg = await Message.findById(msgId); if(msg && !msg.readBy.includes(nickname)) { msg.readBy.push(nickname); await msg.save(); io.to(msg.roomId).emit('update_msg', msg); } });
    socket.on('read_room', async ({ roomId, nickname: rawNick }) => { const nickname = nfc(rawNick); await Message.updateMany({ roomId, readBy: { $ne: nickname } }, { $addToSet: { readBy: nickname } }); socket.to(roomId).emit('user_read_all', { nickname }); });
    socket.on('delete_msg', async ({ msgId }) => { const msg = await Message.findById(msgId); if (msg && msg.user === socket.nickname) { if (msg.file && msg.file.url) { const filePath = path.join(__dirname, 'public', msg.file.url); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } msg.isDeleted = true; msg.text = '삭제된 메시지입니다.'; msg.file = null; await msg.save(); io.to(socket.roomId).emit('update_msg', msg); } });
    socket.on('edit_msg', async ({ msgId, newText }) => { const msg = await Message.findById(msgId); if (msg && msg.user === socket.nickname && !msg.isDeleted) { msg.text = newText; msg.isEdited = true; await msg.save(); io.to(socket.roomId).emit('update_msg', msg); } });
    socket.on('join_call', () => { socket.to(socket.roomId).emit('new_caller', socket.id); });
    socket.on('nuke', async () => { if(!socket.roomId) return; await destroyRoomAndFiles(socket.roomId); io.to(socket.roomId).emit('nuke_trigger'); io.in(socket.roomId).socketsLeave(socket.roomId); });
    socket.on('set_timer', (minutes) => { const roomId = socket.roomId; const ms = minutes * 60 * 1000; io.to(roomId).emit('timer_start', Date.now() + ms); setTimeout(async () => { if (await Room.findOne({ roomId })) { await destroyRoomAndFiles(roomId); io.to(roomId).emit('nuke_trigger'); io.in(roomId).socketsLeave(roomId); } }, ms); });
    socket.on('leave_room', () => { if(socket.roomId) { socket.leave(socket.roomId); socket.roomId = null; } });
    socket.on('offer', (p) => io.to(p.target).emit('offer', p));
    socket.on('answer', (p) => io.to(p.target).emit('answer', p));
    socket.on('ice-candidate', (p) => io.to(p.target).emit('ice-candidate', p));
});

server.listen(80, () => console.log('✅ BaboTalk Server V16.0 (Strict 1:1 DM Isolation) Running...'));
