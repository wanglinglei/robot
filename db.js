/*
 * @Author: wanglinglei
 * @Date: 2022-04-05 19:56:03
 * @LastEditors: wanglinglei
 * @LastEditTime: 2022-04-06 20:57:18
 * @Description: file content
 */
var mysql = require("mysql");

// 创建MySql连接池并配置参数
const mysqlConf = {
  host: "localhost",
  user: "root",
  password: "123456",
  database: "voteshop",
  dateStrings: true,
};
// 用于保存数据连接实例
var db = null;
var pingInterval;

// 如果数据连接出错，则重新连接
function handleError(err) {
  connect();
}

// 建立数据库连接
function connect() {
  if (db !== null) {
    db.destroy();
    db = null;
  }

  db = mysql.createConnection(mysqlConf);
  db.connect(function (err) {
    if (err) {
      setTimeout(connect, 2000);
    }
    console.log("db connect");
  });
  db.on("error", handleError);

  // 每个小时ping一次数据库，保持数据库连接状态
  clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    db.ping();
  }, 3600000);
  return db;
}
module.exports = { connect };
