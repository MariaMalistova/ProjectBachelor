const pool = require('./pool');
const bcrypt = require('bcrypt');

function User() {};

User.prototype = {
    find : function(user = null, callback)
    {
        if(user) {
            var field = Number.isInteger(user) ? 'id' : 'username';
        }
        let sql = `SELECT * FROM users WHERE ${field} = ?`;

        pool.query(sql, user, function(err, result) {
            if(err) throw err

            if(result.length) {
                callback(result[0]);
            } else {
                callback(null);
            }
        });
    },

    create : function(body, callback) 
    {
        this.find(body.username, function(user) {
            if(user) {
                callback(null);
            } else {
                var pwd = body.password;
                body.password = bcrypt.hashSync(pwd,10);
                var bind = [];
                for(prop in body){
                    bind.push(body[prop]);
                }
                let sql = `INSERT INTO users(username, name, surname, patronym, password) VALUES (?, ?, ?, ?, ?)`;
                pool.query(sql, bind, function(err, result) {
                    if(err) throw err;
                    callback(result.insertId);
                });
            }
            
        });

    },

    login : function(username, password, callback)
    {
        this.find(username, function(user) {
            if(user) {
                if(bcrypt.compareSync(password, user.password)) {
                    callback(user);
                    return;
                }  
            }
            callback(null);
        });
        
    },
    profileGet : function(callback)
    {
        pool.query(`SELECT id, nameP FROM profiles`, function(err, result) {
            if(err) throw err;
            callback(result);
        }); 
    },

    profileGetName : function(name, callback)
    {
        pool.query(`SELECT id, nameP FROM profiles WHERE nameP = ?`, name, function(err, result) {
            if(err) throw err;
            callback(result[0]);
        }); 
    },

    profileGetParam : function(idParam, callback)
    {
        let params = '';
        for (let i = 0; i < idParam.length - 1; i++) {
            params += '?,' 
        }
        params += '?';
        pool.query('SELECT id, nameP FROM profiles WHERE id in (' + params + ')', idParam, function(err, result) {
            if(err) throw err;
            callback(result);
        }); 
    },
    
    criteriaGet : function(callback)
    {
        pool.query(`SELECT * FROM criteria`, function(err, result) {
            if(err) throw err;
            callback(result);
        }); 
    },

    insertdata : function(user, body, callback) 
    {
        let sql = `SELECT * FROM userdata WHERE user = ?`;

        pool.query(sql, user, function(err, result) {
            if(err) throw err
            if(result.length) {
                let params = '';
                for(prop in body){
                    params += prop;
                    if (!(typeof body[prop] == "boolean" || typeof body[prop] == "number" || body[prop] == '')) {
                        params += ' = "';
                    } else {
                        params += ' = '; 
                    }
                    if (body[prop] == "") {
                        params += null;
                    } else {
                        params += body[prop];
                    }
                    if (!(typeof body[prop] == "boolean" || typeof body[prop] == "number" || body[prop] == '')) {
                        params += '", ';
                    } else {
                        params += ', '; 
                    }
                }
                params = params.substr(0, params.length - 2);
                let sqlUpdate = 'UPDATE userdata set ' + params + ' WHERE user = ?';
                pool.query(sqlUpdate, user, function(err, result) {
                    if(err) throw err;
                    callback(result.affectedRows);    
                });  
            } else {
                let params = '';
                let actparams = '';
                var bind = [];
                for(prop in body){
                    params += prop + ', ';
                    actparams += '?,';
                    if (body[prop] == "") {
                        bind.push(null);
                    } else {
                        bind.push(body[prop]);
                    }
                }
                params = params.substr(0, params.length - 2);
                actparams = actparams.substr(0, actparams.length - 1);

                let sqlInsert = 'INSERT userdata(' + params + ') VALUES (' + actparams + ')';
                pool.query(sqlInsert, bind, function(err, result) {
                    if(err) throw err;
                    callback(result.insertId);    
                }); 
            }
        });  

    },
    
    selectdata : function(user, callback)
    {
        pool.query(`SELECT * FROM userdata WHERE user = ?`, user, function(err, result) {
            if(err) throw err;
            callback(result[0]);
        }); 
    },
    
    getfacl : function(prof, callback)
    {
        if (prof) {
            pool.query(`SELECT nameF, nameP FROM faculties INNER JOIN profiles ON faculties.id = profiles.faculty where profiles.id = ?`, prof, function(err, result) {
                if(err) throw err;
                callback(result[0]);
            });    
        } else {
            callback("");
        }
         
    },
    
    selectusers : function(callback)
    {
        pool.query(`SELECT id, surname, name, patronym FROM users where appdone = true`, function(err, result) {
                if(err) throw err;
                callback(result);
            });
    }
}

module.exports = User;