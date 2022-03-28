const express = require('express');
const request = require("request");
const app = express();
const bodyParser = require("body-parser");
const schedule = require('node-schedule');
const mysql = require('mysql')
const { v4: uuidv4 } = require('uuid');
app.use(bodyParser.json());
// 连接数据库
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'voteshop'
});
connection.connect(() => {
  console.log('connect success');

});
// 本地数据
const hookUrrl = `https://oapi.dingtalk.com/robot/send?access_token=e2711e5a9e64104f1ef0ab09fad0e923efa45335487f5f80caea6953ebfeff6f`
let voteResult = [];
app.use(bodyParser.json());

app.all('', function (req, res, next) {

  res.header('Access-Control-Allow-Origin', '');

  //Access-Control-Allow-Headers ,可根据浏览器的F12查看,把对应的粘贴在这里就行

  res.header('Access-Control-Allow-Headers', 'Content-Type');

  res.header('Access-Control-Allow-Methods', '*');

  res.header('Content-Type', 'application/json;charset=utf-8');

  next();

});

app.get("/createpoststable", (req, res) => {
  let sql = "CREATE TABLE shop(id VARCHAR(100) ,name VARCHAR(100),createTime BIGINT(20),updateTime BIGINT(20),sort INT(11),voteNumber INT(11),PRIMARY KEY(id)) default character set utf8 collate utf8_general_ci"
  connection.query(sql, (err, result) => {
    if (err) throw err;
    console.log(result);
    res.send('posts表已经建立')
  })
})

//  投票接口
app.get('/robot/vote', (req, res) => {
  const { vote, id } = req.query;
  console.log(voteResult, req.query);
  const voteIndex = voteResult.findIndex((item) => {
    return item.name === vote
  })
  if (voteIndex > -1) {
    voteResult[voteIndex].voteNum += 1;
    res.send({
      status: 'success',
      msg: '投票成功',
    })
  }

})

// 查询配置列表
app.get('/allList', (req, res) => {
  connection.query('SELECT * FROM shop', (err, dbRes) => {
    res.send({
      status: 'success',
      data: dbRes,
      msg: '查询成功'
    })
  })
})
// 
// 新增
app.post('/add', (req, res) => {

  const { name, sort } = req.body;
  connection.query(`SELECT * FROM shop where name='${name}'`, (err, dbRes) => {
    if (err) {
      res.send({
        status: 'fail',
        msg: '系统异常'
      })
    } else {
      if (dbRes && dbRes.length === 0) {
        const id = uuidv4().replace(/-/g, '')
        const nowTime = Date.now()
        connection.query(
          `INSERT INTO shop(id,name,createTime,updateTime,sort,voteNumber) VALUES('${id}','${name}','${nowTime}','${nowTime}','${sort}','0')`)

        res.send({
          status: 'success',
          msg: '新增成功'
        })
      } else {
        res.send({
          status: 'fail',
          msg: '店铺已存在'
        })
      }
    }
  })

})
// 修改
app.post('/update', (req, res) => {
  const { id, name, sort } = req.body;
  if (id) {
    connection.query(`SELECT * FROM shop where id='${id}'`, (err, dbRes) => {
      if (dbRes && dbRes.length) {
        const updateTime = Date.now()
        connection.query(
          `UPDATE shop SET updateTime = '${updateTime}',name='${name}',sort = '${sort}' WHERE id = '${id}'`,
          (err, dbRes) => {
            if (err) {
              res.send({
                status: 'fail',
                msg: '修改失败'
              })
            } else {
              res.send({
                status: 'success',
                msg: '修改成功'
              })
            }

          })
      } else {
        res.send({
          status: 'fail',
          msg: '店铺不存在'
        })
      }
    })
  }
})
//  删除
app.post('/delete', (req, res) => {
  const { id } = req.body;
  if (id) {
    connection.query(`DELETE FROM shop where id='${id}'`, (err, dbRes) => {
      if (err) {
        res.send({
          status: 'fail',
          msg: '系统异常'
        })
      } else {
        res.send({
          status: 'success',
          msg: '删除成功'
        })
      }
    })

  }
})

app.listen(8083, () => {
  console.log('services success')
});








// 生成不重复的选项
function createSelectList (number) {


}

// 统计各个元素出现的次数
function statisticVote () {
  if (voteResult.length > 0) {
    let msg = '投票结果：'
    // 处理平票情况 平票在所有平票选项中随机结果
    voteResult.sort((a, b) => {
      return b.voteNum - a.voteNum
    })
    // 找到最后一个和一一组数据相同项
    const firstRes = voteResult[0];
    console.log(firstRes, 'firstRes');
    let firstDiffIndex;
    for (let index = 0; index < voteResult.length; index++) {
      if (!firstDiffIndex) {
        if (voteResult[index].voteNum !== firstRes.voteNum) {
          firstDiffIndex = index
        }
      }


    }
    let voteRes = {};
    if (firstDiffIndex) {
      let sameList = voteResult.slice(0, firstDiffIndex);
      let resIndex = Math.floor(Math.random() * sameList.length);
      voteRes = sameList[resIndex]
    } else {
      voteRes = firstRes
    }
    voteResult.forEach((item) => {
      msg += `${item.name}${item.voteNum}票，`
    })
    const { id, voteNumber = 0 } = voteRes
    connection.query(
      `UPDATE shop SET voteNumber = '${voteNumber + 1}' WHERE id = '${id}'`)
    return msg + `最终结果为${voteRes.name}。`
  }
}

// 每个工作日 10点半 推送投票消息
function createVoteMsg () {
  schedule.scheduleJob('0 15 10 * * 1-5', () => {
    //查询店铺列表
    voteResult = []
    connection.query('SELECT * FROM shop order by sort ', (err, dbRes) => {
      const waitSelectList = dbRes.splice(0, 6)
      const allLength = waitSelectList.length;
      let selectIndexList = [];
      let selectList = [];
      if (4 < allLength) {
        for (let index = 0; index < 4; index++) {
          let creatIndex = Math.floor(Math.random() * allLength);
          if (selectIndexList.includes(creatIndex)) {
            index--;
          } else {
            selectIndexList.push(creatIndex);
            selectList.push(waitSelectList[creatIndex]);
            voteResult.push({
              ...waitSelectList[creatIndex],
              voteNum: 0
            })
          }
        }
      } else {
        selectList = [...waitSelectList]
        voteResult = waitSelectList.map(item => {
          return {
            ...item,
            voteNum: 0
          }
        });
      }
      const msgList = selectList.map((item) => {
        return {
          title: item.name,
          actionURL: `http://101.201.118.109:8083/robot/vote?vote=${item}&id=${item.id}`
        }
      })
      const resData = {
        msgtype: "actionCard",
        actionCard: {
          title: "中午吃啥呢,投票啦",
          text: "中午吃啥呢",
          btns: msgList,
          btnOrientation: "0"

        },
      }
      try {
        let options = {
          headers: {
            "Content-Type": "application/json;charset=utf-8"
          },
          json: resData
        }
        request.post(hookUrrl, options, function (error, response, body) {
        });
      } catch (error) {
        console.log(error);
      }
    })
  });
}


// 12点推送投票结果
function pushVoteResult () {
  //每分钟的第30秒定时执行一次:
  schedule.scheduleJob('0 0 12 * * 1-5', () => {

    const msg = statisticVote();
    const resData = {
      at: {
        "isAtAll": false
      },
      text: {
        content: msg
      },
      msgtype: "text"

    }
    try {
      let options = {
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        json: resData
      }
      request.post(hookUrrl, options, function (error, response, body) {
      });
    } catch (error) {
      console.log(error);
    }
  });
}

createVoteMsg();
pushVoteResult();
