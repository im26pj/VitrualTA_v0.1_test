const Group = require("../models/Group");
const mongoose = require("mongoose"); // 新增：引入 mongoose
const WebSocket = require('ws');

// 🔹 產生隨機群組代碼 (8 碼，大小寫字母)
const generateCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 取得所有群組（修改為只取得使用者相關的群組）
// groupController.js
exports.getAllGroups = async (req, res) => {
  try {
    const { userId } = req.query;

    let groups;
    if (userId) {
      // 增加偵錯訊息
      console.log(`正在查詢用戶 ${userId} 的群組`);
      
      // 先確保 userId 是有效值
      groups = await Group.find({ members: userId })
        .populate({
          path: "members",
          select: "fullname email",
          model: "User" // 明確指定關聯模型
        });
      
      // 偵錯
      if (groups.length > 0) {
        console.log(`找到 ${groups.length} 個群組`);
        console.log(`第一個群組的成員:`, JSON.stringify(groups[0].members));
      }
    } else {
      groups = await Group.find().populate({
        path: "members",
        select: "fullname email",
        model: "User"
      });
    }

    res.json(groups.map(g => ({
      _id: g._id,
      name: g.name,
      code: g.code,
      ownerId: g.ownerId,
      members: g.members.map(m => ({
        _id: m._id,
        fullname: m.fullname || "未知用戶" // 增加預設值
      })),
    })));
  } catch (err) {
    console.error('Error in getAllGroups:', err);
    res.status(500).json({ error: "獲取群組失敗", details: err.message });
  }
};


// 建立群組
exports.createGroup = async (req, res) => {
  try {
    const { name, ownerId } = req.body;

    const code = generateCode(8); // 產生 8 碼大小寫代碼

    const newGroup = new Group({
      name,
      code,
      ownerId,
      members: [ownerId], // 創建者自動加入
      files: [],
      messages: [],
    });

    await newGroup.save();

    // 🔹 回傳必要資訊給前端
    res.json({
      _id: newGroup._id,
      name: newGroup.name,
      code: newGroup.code,
      ownerId: newGroup.ownerId,
    });
  } catch (err) {
    res.status(500).json({ error: "建立群組失敗", details: err.message });
  }
};

// 取得群組詳細資料（確保回傳 fullname）
exports.getGroupById = async (req, res) => {
  try {
    console.log(`查詢群組: ${req.params.id}`);
    
    // 改進 populate，確保正確填充 senderId
    const group = await Group.findById(req.params.id)
      .populate("members", "fullname email")
      .populate({
        path: "messages.senderId", 
        select: "fullname email",
        model: "User" // 明確指定關聯模型
      });

    if (!group) return res.status(404).json({ error: "群組不存在" });
    
    // 新增: 檢查是否成功填充了成員資料
    console.log("成員數據:", JSON.stringify(group.members));
    
    // 確保資料格式一致
    const formattedMembers = group.members.map(member => {
      // 檢查成員資料是否完整
      if (!member.fullname) {
        console.log(`成員 ${member._id} 缺少 fullname`);
      }
      
      return {
        _id: member._id.toString(),
        fullname: member.fullname || "未知用戶",
        email: member.email || "無郵箱"
      };
    });

    // 加入偵錯資訊，檢查 messages
    console.log(`群組 ${group._id} 有 ${group.messages.length} 條訊息`);
    if (group.messages.length > 0) {
      console.log('第一條訊息範例:', JSON.stringify(group.messages[0]));
    }

    res.json({
      _id: group._id,
      name: group.name,
      code: group.code,
      ownerId: group.ownerId,
      members: await Promise.all(group.members.map(async member => {
        // 如果 member 只是 ID，手動查詢用戶
        if (!member.fullname) {
          try {
            const User = mongoose.model('User');
            const user = await User.findById(member._id || member);
            return {
              _id: member._id || member,
              fullname: user?.fullname || "未知用戶"
            };
          } catch (err) {
            console.error(`查詢用戶 ${member._id || member} 失敗:`, err);
            return { _id: member._id || member, fullname: "未知用戶" };
          }
        }
        return { _id: member._id, fullname: member.fullname || "未知用戶" };
      })),
      files: group.files,
      messages: group.messages.map(msg => {
        // 改進對 senderId 的處理
        let senderName = '未知用戶';
        let senderId = msg.senderId;
        
        // 判斷 senderId 類型並正確提取資料
        if (msg.senderId) {
          if (typeof msg.senderId === 'object' && msg.senderId._id) {
            // 已經被 populate，是一個對象
            senderId = msg.senderId._id;
            senderName = msg.senderId.fullname || '未知用戶';
          } else {
            // senderId 是一個 ID 字串，嘗試從 members 中找到對應用戶
            const member = formattedMembers.find(m => m._id.toString() === msg.senderId.toString());
            if (member) {
              senderName = member.fullname;
            }
          }
        }
        
        // 格式化時間為易讀形式
        const formattedTime = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : '';
        
        return {
          _id: msg._id,
          senderId: senderId,
          senderName: senderName,
          displayName: senderName,
          content: msg.content,
          timestamp: msg.timestamp,
          formattedTime: formattedTime
        };
      })
    });
  } catch (err) {
    console.error('Error in getGroupById:', err);
    res.status(500).json({ error: "取得群組資料失敗", details: err.message });
  }
};

// 加入群組
exports.joinGroup = async (req, res) => {
  try {
    const { code } = req.params; // 從 URL 參數獲取群組代碼
    const { userId } = req.body;

    console.log('接收到的參數:', { code, userId }); // 調試日誌

    // 🔹 先檢查資料庫中所有群組的代碼
    const allGroups = await Group.find({}, 'name code');
    console.log('資料庫中所有群組:', allGroups);

    // 🔹 用群組代碼找群組 - 不轉換大小寫，保持原樣
    const group = await Group.findOne({ code: code }).populate("members", "fullname");
    console.log('查找群組結果:', group);

    if (!group) {
      // 再嘗試大小寫不敏感的查找
      const groupIgnoreCase = await Group.findOne({ 
        code: { $regex: new RegExp(`^${code}$`, 'i') }
      }).populate("members", "fullname");
      
      console.log('大小寫不敏感查找結果:', groupIgnoreCase);
      
      if (!groupIgnoreCase) {
        return res.status(404).json({ error: "群組代碼無效，找不到對應的群組" });
      }
      
      // 如果找到了，使用這個群組
      group = groupIgnoreCase;
    }

    // 🔹 判斷成員是否已存在
    const isAlreadyMember = group.members.some(member => member._id.toString() === userId);
    
    if (isAlreadyMember) {
      // 如果已經是成員，回傳群組資訊讓前端跳轉
      return res.json({
        _id: group._id,
        name: group.name,
        code: group.code,
        ownerId: group.ownerId,
        members: group.members.map(m => ({
          _id: m._id,
          fullname: m.fullname,
        })),
        alreadyMember: true, // 標記已經是成員
        message: "您已經是該群組的成員"
      });
    }

    // 🔹 添加新成員
    group.members.push(userId);
    await group.save();
    await group.populate("members", "fullname"); // 重新 populate

    // ✅ 透過 WebSocket 廣播成員更新
    if (req.app.wssInstance) {
      req.app.wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "member_joined",
            groupId: group._id,
            member: { _id: userId, fullname: group.members.find(m => m._id.toString() === userId)?.fullname },
          }));
        }
      });
    }

    res.json({
      _id: group._id,
      name: group.name,
      code: group.code,
      ownerId: group.ownerId,
      members: group.members.map(m => ({
        _id: m._id,
        fullname: m.fullname,
      })),
      alreadyMember: false,
      message: "成功加入群組"
    });
  } catch (err) {
    console.error('加入群組失敗:', err);
    res.status(500).json({ error: "加入群組失敗", details: err.message });
  }
};

// 移除成員
exports.removeMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    // 修正：應該使用 req.params.id 而不是 req.params._id
    const group = await Group.findById(req.params.id).populate("members", "fullname");

    if (!group) return res.status(404).json({ error: "群組不存在" });

    // 🚫 不允許移除群主
    if (memberId.toString() === group.ownerId.toString()) {
      return res.status(400).json({ error: "群組擁有者不能被移除" });
    }

    // ✅ 移除成員，兼容 populate 和 ObjectId
    group.members = group.members.filter(m =>
      (m._id ? m._id.toString() : m.toString()) !== memberId
    );

    await group.save();
    await group.populate("members", "fullname");

    // 確保這裡發送的是完整的成員列表，包含 fullname
    if (req.app.wssInstance) {
      req.app.wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "member_update",
            groupId: group._id,
            members: group.members.map(m => ({ _id: m._id, fullname: m.fullname })),
          }));
        }
      });
    }

    res.json({
      _id: group._id,
      name: group.name,
      code: group.code,
      ownerId: group.ownerId,
      members: group.members.map(m => ({
        _id: m._id,
        fullname: m.fullname,
      })),
      removedMemberId: memberId,
    });
  } catch (err) {
    res.status(500).json({ error: "移除成員失敗", details: err.message });
  }
};

// 離開群組
exports.leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    console.log('離開群組請求:', { groupId: id, userId });
    
    // 檢查必要參數
    if (!id || !userId) {
      return res.status(400).json({ 
        error: "缺少必要參數",
        details: "groupId 和 userId 都是必需的"
      });
    }
    
    // 查找群組
    const group = await Group.findById(id);
    if (!group) {
      console.log(`群組不存在: ${id}`);
      return res.status(404).json({ error: "群組不存在" });
    }
    
    console.log('群組資料:', {
      groupId: group._id,
      ownerId: group.ownerId,
      membersCount: group.members.length,
      requestUserId: userId
    });
    
    // 檢查用戶是否是群組成員
    const isMember = group.members.some(memberId => memberId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ error: "您不是該群組的成員" });
    }
    
    // 確保不是群主
    if (group.ownerId.toString() === userId) {
      return res.status(400).json({ error: "群主不能離開群組，請先轉移群主權限或刪除群組" });
    }
    
    // 從成員列表中移除用戶
    const originalMemberCount = group.members.length;
    group.members = group.members.filter(memberId => memberId.toString() !== userId);
    
    console.log(`成員數量變化: ${originalMemberCount} -> ${group.members.length}`);
    
    // 保存變更
    await group.save();
    
    // 透過 WebSocket 通知其他成員
    if (req.app.wssInstance) {
      req.app.wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "member_left",
            groupId: group._id,
            leftUserId: userId,
            remainingMemberCount: group.members.length
          }));
        }
      });
    }
    
    console.log('用戶成功離開群組');
    res.json({ 
      success: true,
      message: "成功離開群組",
      remainingMemberCount: group.members.length
    });
    
  } catch (err) {
    console.error('離開群組失敗:', err);
    res.status(500).json({ 
      error: "離開群組失敗", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// 發送群組訊息
exports.sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { senderId, content } = req.body;
    
    // 增加調試日誌
    console.log('收到發送訊息請求:', { groupId, senderId, content });
    
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`群組不存在: ${groupId}`);
      return res.status(404).json({ error: "群組不存在" });
    }
    
    // 檢查發送者是否為群組成員
    const isMember = group.members.some(m => m.toString() === senderId);
    console.log(`用戶 ${senderId} 是否為群組成員: ${isMember}`);
    
    if (!isMember) {
      return res.status(403).json({ error: "您不是該群組成員" });
    }
    
    // 建立新訊息 - 符合資料庫格式
    const newMessage = {
      senderId,
      content,
      timestamp: new Date()
    };
    
    // 添加到群組訊息中
    group.messages.push(newMessage);
    await group.save();
    console.log('訊息已保存到資料庫, ID:', newMessage._id);
    
    // 格式化時間
    const formattedTime = new Date().toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    
    // 取得發送者名稱
    const User = mongoose.model('User');
    const sender = await User.findById(senderId);
    const senderName = sender?.fullname || "未知用戶";
    
    // 檢查 WebSocket 實例並廣播
    if (!req.app.wssInstance) {
      console.log('警告: WebSocket 實例不存在');
    } else {
      const clientCount = [...req.app.wssInstance.clients].filter(c => c.readyState === WebSocket.OPEN).length;
      console.log(`發送 WebSocket 訊息給 ${clientCount} 個連接客戶端`);
      
      // 通過 WebSocket 廣播訊息 - 格式與資料庫一致
      req.app.wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "new_message",
            groupId,
            message: {
              _id: newMessage._id,
              senderId,
              senderName,
              content,
              timestamp: newMessage.timestamp,
              formattedTime
            }
          }));
        }
      });
    }
    
    console.log('操作成功完成');
    res.json({ 
      success: true, 
      message: {
        _id: newMessage._id,
        senderId,
        content,
        timestamp: newMessage.timestamp
      }
    });
  } catch (err) {
    console.error('發送訊息失敗:', err);
    res.status(500).json({ error: "發送訊息失敗", details: err.message });
  }
};

// 取得群組訊息
exports.getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await Group.findById(id)
      .populate("messages.senderId", "fullname")
      .select("messages");
    
    if (!group) {
      return res.status(404).json({ error: "群組不存在" });
    }
    
    res.json({ messages: group.messages });
  } catch (err) {
    console.error('取得群組訊息失敗:', err);
    res.status(500).json({ error: "取得群組訊息失敗", details: err.message });
  }
};