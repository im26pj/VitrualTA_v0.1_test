const path = require("path");
const Group = require("../models/Group");

// 上傳檔案到群組
exports.uploadFileToGroup = async (req, res) => {
  const { groupId } = req.query;
  const group = await Group.findById(groupId);

  if (!group) return res.status(404).json({ error: "群組不存在" });

  const fileData = {
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`, // 存相對路徑
  };

  group.files.push(fileData);
  await group.save();

  res.json({ fileName: fileData.name, fileUrl: fileData.url });
};
