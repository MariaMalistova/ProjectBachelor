const express = require('express');
const User = require('../core/user');
const router = express.Router();

var PizZip = require('pizzip');
var Docxtemplater = require('docxtemplater');
var fs = require('fs');
var path = require('path');
var FileSaver = require('file-saver');
const multer  = require("multer");

const user = new User();

router.get('/', (req, res, next) => {   
    let user = req.session.user;
    if(user) {
        res.redirect('/home');
        return;
    }
    res.redirect('login');
})

router.get('/home', (req, res, next) => {
    let user = req.session.user;
    if(user) {
        res.render('home', {session:req.session.user, surname:user.surname, name:user.name, patronym:user.patronym});
        return;
    }
    res.redirect('/');
});

router.post('/login', (req, res, next) => {
    user.login(req.body.username, req.body.password, function(result) {
        if(result) {
            req.session.user = result;
            if (result.role) {
                res.redirect('/usersinformation');
            } else {
                res.redirect('/personaldata');    
            }
        }else {
            res.render('login', {errs:true});
        }
    })
});

router.get('/usersinformation', (req, res, next) => {
    user.selectusers(function(result) {
        res.render("usersinformation", {session:req.session.user, users:result});
    });
});

router.get('/login', (req, res, next) => {
    res.render("login");
});

router.post('/register', (req, res, next) => {
    let userInput = {
        username: req.body.username,
        name: req.body.name,
        surname: req.body.surname,
        patronym: req.body.patronym,
        password: req.body.password
    };
    user.create(userInput, function(lastId) {
        if(lastId) {
            user.find(lastId, function(result) {
                req.session.user = result;
                res.redirect('/personaldata');
            });
        }else {
            res.render('register',{users:userInput, errs:true});
        }
    });
});

router.get('/register', (req, res, next) => {
    res.render("register",{users:[]});
});

router.get('/loggout', (req, res, next) => {
    if(req.session.user) {
        req.session.destroy(function() {
            res.redirect('/');
        });
    }
});

router.get('/chooseprofilestep1', (req, res, next) => {
    if (req.session.user){
        user.profileGet(function(result) {
        res.render("chooseprofilestep1", {session:req.session.user, profiles:result});
            });
    } else {
        res.redirect("/login");
    }
    
});

router.post('/chooseprofilestep1', (req, res, next) => {
    if (req.session.user) {
        let checkP = [];
        for (let prop in req.body) {
            checkP.push(+prop.substr(13));
        }
        if (checkP.length < 2 || checkP.length > 6) {
            res.redirect("/chooseprofilestep1");
        }
        user.profileGetParam(checkP, function(result) {
            req.session.profilesId = result;
            user.criteriaGet(function(result) {
                req.session.criterias = result;
                res.render("chooseprofilestep2", {session:req.session.user, criterias:result});    
            });
        });     
    } else {
        res.redirect("/login");
    }
});

router.post('/chooseprofilestep2', (req, res, next) => {
    if (req.session.user) {
        let checkC = [];
        for (let prop in req.body) {
            checkC.push(req.body[prop]);
        }
        for (let i = 0; i < checkC.length; i++) {
            if (checkC[i] > 0) {
                checkC[i] = 1 / checkC[i];
            } else {
                checkC[i] = Math.abs(checkC[i]) + 2;
            }
        }

        let criteriaCount = req.session.criterias.length;
        let critM = [];
        for (let i = 0; i < criteriaCount; i++) {
            critM[i] = [];
        }
        let critMCount = 0;
        for (let i = 0; i < criteriaCount; i++) {
            for (let j = i; j < criteriaCount; j++) {
                if (i == j) {
                    critM[i][j] = 1;
                } else {
                    critM[i][j] = checkC[critMCount];
                    critMCount++;
                } 
            }
        }

        for (let i = 0; i < criteriaCount; i++) {
            for (let j = 0; j <= i; j++) {
                critM[i][j] = 1 / critM[j][i];
            }
        }
        let critW = [];
        for (let i = 0; i < criteriaCount; i++) {
            let critSum = 0;
            for (let j = 0; j < criteriaCount; j++) {
                critSum += critM[j][i];
            }
            critW[i] = 1 / critSum;
        }
        console.log(critW);
        req.session.critMatr = critW;
        res.render("chooseprofilestep3", {session:req.session.user, profiles:req.session.profilesId, criterias:req.session.criterias});
    } else {
        res.redirect("/login");
    }
});

router.post('/chooseprofilestep3', (req, res, next) => {
    if (req.session.user) {
        let checkP = [];
        for (let prop in req.body) {
            checkP.push(req.body[prop]);
        }
        for (let i = 0; i < checkP.length; i++) {
            for (let j = 0; j < checkP[i].length; j++) {
                if (checkP[i][j] > 0) {
                    checkP[i][j] = 1 / checkP[i][j];
                } else {
                    checkP[i][j] = Math.abs(checkP[i][j]) + 2;
                }
            }
        }
        let profilesCount = req.session.profilesId.length;
        let criteriaCount = req.session.criterias.length;
        let critPs = [];
        for (let i = 0; i < criteriaCount; i++) {
            critPs[i] = [];
        }
        for (let i = 0; i < criteriaCount; i++) {
            for (let j = 0; j < profilesCount; j++) {
                critPs[i][j] = [];
            }
        }
        let critPCount = 0;
        for (let i = 0; i < criteriaCount; i++) {
            for (let j = 0; j < profilesCount - 1; j++) {
                for (let k = j + 1; k < profilesCount; k++) {
                    critPs[i][j][k] = checkP[j + k - 1][i];
                    critPCount++;
                }
            }
        }
        
        for (let i = 0; i < criteriaCount; i++) {
            for (let j = 0; j < profilesCount; j++) {
                for (let k = 0; k < profilesCount; k++) {
                    if (j == k) {
                        critPs[i][j][k] = 1;
                    }
                }
            }
        }
       
        for (let i = 0; i < criteriaCount; i++) {
            for (let j = 0; j < profilesCount; j++) {
                for (let k = 0; k <= j; k++) {
                    critPs[i][j][k] = 1 / critPs[i][k][j];
                }
            }
        }
        let critW = [];

        for (let i = 0; i < criteriaCount; i++) {
            critW[i] = [];
            for (let j = 0; j < profilesCount; j++) {
                let critSum = 0;
                let critMul = 1;
                for (let k = 0; k < profilesCount; k++) {
                    critSum += critPs[i][k][j];
                    critMul *= critPs[i][k][j];
                }
                critW[i][j] = Math.pow(critMul, 1/3);
                critW[i][j] = critW[i][j] / critSum;
            }
        }
        critWC = req.session.critMatr;
        let finW = [];
        for (let i = 0; i < profilesCount; i++) {
            let fSum = 0;
            for (let j = 0; j < criteriaCount; j++) {
                fSum += critWC[j] * critW[j][i]
            }
            finW[i] = fSum;
        }
        console.log(finW)
        let max = finW[0];
        let id = 0;
        for (let i = 0; i < finW.length; i++) {
            if(finW[i] > max){
                max = finW[i];
                id = i;  
            }
        }
        let finResult = req.session.profilesId[id].nameP;
        res.render("chooseprofileresult", {session:req.session.user, finResult:finResult});
     } else {
        res.redirect("/login");
    }
});

router.post('/personaldata', (req, res, next) => {
    if (req.session.user) {
        user.selectdata(thisuser.id, function(result) {
            if (result) {
                if (result.dateofbirth) {
                    let data = result.dateofbirth;
                    result.dateofbirth = String(data.getFullYear()+'-');
                    if (data.getMonth()+1 < 10){
                        result.dateofbirth += '0';
                    }
                    result.dateofbirth += String((data.getMonth()+1)+'-');
                    if (data.getDate() < 10){
                        result.dateofbirth += '0';
                    }
                    result.dateofbirth += String(data.getDate());    
                }
                res.render("personaldata", {session:req.session.user, info:result});        
            } else {
                res.render("personaldata", {session:req.session.user, info:[]});        
            }
            
        });
    } else {
        res.redirect("/login");
    }
});

router.get('/personaldata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        user.selectdata(thisuser.id, function(result) {
            if (result) {
                if (result.dateofbirth) {
                    let data = result.dateofbirth;
                    result.dateofbirth = String(data.getFullYear()+'-');
                    if (data.getMonth()+1 < 10){
                        result.dateofbirth += '0';
                    }
                    result.dateofbirth += String((data.getMonth()+1)+'-');
                    if (data.getDate() < 10){
                        result.dateofbirth += '0';
                    }
                    result.dateofbirth += String(data.getDate());    
                }
                res.render("personaldata", {session:req.session.user, info:result});        
            } else {
                res.render("personaldata", {session:req.session.user, info:[]});        
            }
            
        });
    } else {
        res.redirect("/login");
    }
});

router.post('/passportdata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.gender = req.body.gender;
        bodyCopy.dateofbirth = req.body.dateofbirth;
        bodyCopy.birthplace = req.body.birthplace;
        bodyCopy.birthcountry = req.body.birthcountry;
        bodyCopy.citizenship = req.body.citizenship;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                let thisuser = req.session.user;
                user.selectdata(thisuser.id, function(result) {
                    if (result) {
                        if (result.datepass) {
                            let data = result.datepass;
                            result.datepass = String(data.getFullYear()+'-');
                            if (data.getMonth()+1 < 10){
                                result.datepass += '0';
                            }
                            result.datepass += String((data.getMonth()+1)+'-');
                            if (data.getDate() < 10){
                                result.datepass += '0';
                            }
                            result.datepass += String(data.getDate());     
                        }
                        res.render("passportdata", {session:req.session.user, info:result});        
                    } else {
                        res.render("passportdata", {session:req.session.user, info:[]});        
                    }
                });
            }else {
                res.send('error');
            }
        });
    } else {
        res.redirect("/login");
    }
});

router.post('/contactsdata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.seria = req.body.seria;
        bodyCopy.number = req.body.number;
        bodyCopy.whopass = req.body.whopass;
        bodyCopy.datepass = req.body.datepass;
        bodyCopy.codepass = req.body.codepass;
        bodyCopy.snils = req.body.snils;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                let thisuser = req.session.user;
                user.selectdata(thisuser.id, function(result) {
                    if (result) {
                        let data = result.datepass;
                        result.datepass = String(data.getFullYear()+'-');
                        if (data.getMonth()+1 < 10){
                            result.datepass += '0';
                        }
                        result.datepass += String((data.getMonth()+1)+'-');
                        if (data.getDate() < 10){
                            result.datepass += '0';
                        }
                        result.datepass += String(data.getDate());
                        res.render("contactsdata", {session:req.session.user, info:result});        
                    } else {
                        res.render("contactsdata", {session:req.session.user, info:[]});        
                    }
                });
            }else {
                res.send('error');
            }
        });    
    } else {
        res.redirect("/login");
    }
});

router.post('/educationdata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.phone = req.body.phone;
        bodyCopy.email = req.body.email;
        bodyCopy.country = req.body.country;
        bodyCopy.region = req.body.region;
        bodyCopy.city = req.body.city;
        bodyCopy.street = req.body.street;
        bodyCopy.house = req.body.house;
        bodyCopy.flat = req.body.flat;
        bodyCopy.indexR = req.body.indexR;
        bodyCopy.isneedlive = req.body.isneedlive ? true : false;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                let thisuser = req.session.user;
                user.selectdata(thisuser.id, function(result) {
                    if (result) {
                        res.render("educationdata", {session:req.session.user, info:result});        
                    } else {
                        res.render("ceducationdata", {session:req.session.user, info:[]});        
                    }
                });
            }else {
                res.send('error');
            }
        });  
    } else {
        res.redirect("/login");
    }
});

router.post('/examdata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.educationschool = req.body.educationschool;
        bodyCopy.schoolname = req.body.schoolname;
        bodyCopy.countryeducate = req.body.countryeducate;
        bodyCopy.regioneducate = req.body.regioneducate;
        bodyCopy.pointeducate = req.body.pointeducate;
        bodyCopy.yeareducate = req.body.yeareducate;
        bodyCopy.attestseria = req.body.attestseria;
        bodyCopy.attestnumber = req.body.attestnumber;
        bodyCopy.isenglish = req.body.isenglish ? true : false;
        bodyCopy.isgerman = req.body.isgerman ? true : false;
        bodyCopy.isfrench = req.body.isfrench ? true : false;
        bodyCopy.isanother = req.body.isanother ? true : false;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                let thisuser = req.session.user;
                user.selectdata(thisuser.id, function(result) {
                    if (result) {
                        res.render("examdata", {session:req.session.user, info:result});        
                    } else {
                        res.render("examdata", {session:req.session.user, info:[]});        
                    }
                });
            }else {
                res.send('error');
            }
        });    
    } else {
        res.redirect("/login");
    }
});

router.get('/examdata', (req, res, next) => {
    res.render("examdata", {session:req.session.user, info:[]});
});

router.post('/profiles', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.isspecialrights = req.body.isspecialrights ? true : false;
        bodyCopy.iswithoustest = req.body.iswithoustest ? true : false;
        bodyCopy.docright = req.body.docright;
        bodyCopy.isdiploma = req.body.isdiploma ? true : false;
        bodyCopy.iskvota = req.body.iskvota ? true : false;
        bodyCopy.achiv1 = req.body.achiv1;
        bodyCopy.achiv2 = req.body.achiv2;
        bodyCopy.achiv3 = req.body.achiv3;
        bodyCopy.formed = req.body.formed;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                let thisuser = req.session.user;
                user.selectdata(thisuser.id, function(result) {
                    user.profileGet(function(resultP) {
                        if (result) {
                            res.render("profiles", {session:req.session.user, info:result, profiles:resultP});        
                        } else {
                            res.render("profiles", {session:req.session.user, info:[], profiles:resultP});        
                        }
                    });
                });
            }else {
                res.send('error');
            }
        });
        
    } else {
        res.redirect("/login");
    }
});

router.post('/extradata', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.RLpoints = req.body.RLpoints;
        bodyCopy.RLege = req.body.RLege;
        bodyCopy.RLyear = req.body.RLyear;
        bodyCopy.Mathpoints = req.body.Mathpoints;
        bodyCopy.Mathege = req.body.Mathege;
        bodyCopy.Mathyear = req.body.Mathyear;
        bodyCopy.PHpoints = req.body.PHpoints;
        bodyCopy.PHege = req.body.PHege;
        bodyCopy.PHyear = req.body.PHyear;
        bodyCopy.SSpoints = req.body.SSpoints;
        bodyCopy.SSege = req.body.SSege;
        bodyCopy.SSyear = req.body.SSyear;
        bodyCopy.HIpoints = req.body.HIpoints;
        bodyCopy.HIege = req.body.HIege;
        bodyCopy.HIyear = req.body.HIyear;
        bodyCopy.LIpoints = req.body.LIpoints;
        bodyCopy.LIege = req.body.LIege;
        bodyCopy.LIyear = req.body.LIyear;
        bodyCopy.RLtest = req.body.RLtest;
        bodyCopy.RLisspecialrights = req.body.RLisspecialrights ? true : false;
        bodyCopy.Mathtest = req.body.Mathtest;
        bodyCopy.Mathisspecialrights = req.body.Mathisspecialrights ? true : false;
        bodyCopy.PHtest = req.body.PHtest;
        bodyCopy.PHisspecialrights = req.body.PHisspecialrights ? true : false;
        bodyCopy.SStest = req.body.SStest;
        bodyCopy.SSisspecialrights = req.body.SSisspecialrights ? true : false;
        bodyCopy.HItest = req.body.HItest;
        bodyCopy.HIisspecialrights = req.body.HIisspecialrights ? true : false;
        bodyCopy.LItest = req.body.LItest;
        bodyCopy.LIisspecialrights = req.body.LIisspecialrights ? true : false;
        bodyCopy.DRtest = req.body.DRtest;
        bodyCopy.DRisspecialrights = req.body.DRisspecialrights ? true : false;
        bodyCopy.Inttest = req.body.Inttest;
        bodyCopy.Intisspecialrights = req.body.Intisspecialrights ? true : false;
        bodyCopy.extratest = req.body.extratest;
        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
            if(lastId) {
                user.selectdata(thisuser.id, function(result) {
                    if (result) {
                        res.render("extradata", {session:req.session.user, info:result});        
                    } else {
                        res.render("extradata", {session:req.session.user, info:[]});        
                    }
                });
            }else {
                res.send('error');
            }
        });   
    } else {
        res.redirect("/login");
    }
});

router.post('/docsload', (req, res, next) => {
    if (req.session.user) {
        let thisuser = req.session.user;
        let bodyCopy = {};
        bodyCopy.user = thisuser.id;
        bodyCopy.profile1 = req.body.profile1;
        bodyCopy.profile2 = req.body.profile2;
        bodyCopy.profile3 = req.body.profile3;
        user.profileGetName(req.body.profile1, function(result) {
            bodyCopy.profile1 = result.id;
            user.profileGetName(req.body.profile2, function(result) {
                bodyCopy.profile2 = result.id;
                user.profileGetName(req.body.profile3, function(result) {
                    bodyCopy.profile3 = result.id;
                    user.insertdata(thisuser.id, bodyCopy, function(lastId) {
                        user.selectdata(thisuser.id, function(result) {
                            res.render("docsload", {session:req.session.user, info:result, dir:path.resolve(__dirname, '../files/user'+thisuser.id+'/application'+thisuser.id+'.docx')});
                        });
                        
                    });                    
                });
                
            });
            
        });
           
    } else {
        res.redirect("/login");
    }
});

router.get('/docsload', (req, res, next) => {
    if (req.session.user) {
        user.selectdata(req.session.user.id, function(result) {
            res.render("docsload", {session:req.session.user, info:result});
        });
    } else {
        res.redirect("/login");
    }
});

router.post('/generate', (req, res, next) => {
    if (req.session.user) {
        function replaceErrors(key, value) {
            if (value instanceof Error) {
                return Object.getOwnPropertyNames(value).reduce(function(error, key) {
                    error[key] = value[key];
                    return error;
                }, {});
            }
            return value;
        }
        
        function errorHandler(error) {
            console.log(JSON.stringify({error: error}, replaceErrors));
        
            if (error.properties && error.properties.errors instanceof Array) {
                const errorMessages = error.properties.errors.map(function (error) {
                    return error.properties.explanation;
                }).join("\n");
                console.log('errorMessages', errorMessages);
                // errorMessages is a humanly readable message looking like this :
                // 'The tag beginning with "foobar" is unopened'
            }
            throw error;
        }
        //Load the docx file as a binary
        var content = fs
        .readFileSync(path.resolve(__dirname, 'zayavleniye.docx'), 'binary');

        var zip = new PizZip(content);
        var doc;
        try {
            doc = new Docxtemplater(zip);
        } catch(error) {
        // Catch compilation errors (errors caused by the compilation of the template : misplaced tags)
            errorHandler(error);
        }
        let thisuser = req.session.user;
        user.selectdata(thisuser.id, function(result) {
            let data;
            if (result.dateofbirth.getDate() < 10){
                data += '0';
            }
            data += String(result.dateofbirth.getDate()) + '.';
            if (result.dateofbirth.getMonth()+1 < 10){
                data += '0';
            }
            data += String((result.dateofbirth.getMonth()+1)+'.');
            data = String(result.dateofbirth.getFullYear());
            let birthplace = result.birthcountry + ", " + result.birthplace;

            let whowhengives;
            if (result.datepass.getDate() < 10){
                whowhengives += '0';
            }
            whowhengives += String(result.datepass.getDate()) + '.';
            if (result.datepass.getMonth()+1 < 10){
                whowhengives += '0';
            }
            whowhengives += String((result.dateofbirth.getMonth()+1));
            whowhengives = String(result.dateofbirth.getFullYear())+' '+result.whopass;
            let fulladress = result.country+", "+result.region+", г. "+result.city+", ул. "+result.street+", д. "+result.house;
            if (result.flat) {
                fulladress += ", кв. "+result.flat;
            }
            let finishschool = result.schoolname+", "+result.countryeducate+", "+result.regioneducate;
            if (result.pointeducate) {
                finishschool += ", " + result.pointeducate;
            }
            let attest;
            let diploma;
            if (result.educationschool == "Школа") {
                attest = "✓";
                diploma = "";
            } else {
                attest = "";
                diploma = "✓";
            }
            let attestser = result.attestseria ? result.attestseria : "";
            let attestnum = result.attestnumber ? result.attestnumber : "";
            let laneng = result.isenglish ? "✓" : "";
            let langem = result.isgerman ? "✓" : "";
            let lanfr = result.isfrench ? "✓" : "";
            let lanan = result.isanother ? "✓" : "";

            let o;
            let ozo;
            let zo;
            if (result.formed == "очная") {
                o = "✓";
                ozo = "";
                zo = "";
            } else if (result.formed == "очно-заочная"){
                o = "";
                ozo = "✓";
                zo = "";
            } else {
                o = "";
                ozo = "";
                zo = "✓";
            }
            let tcel;
            let fed;
            if (result.iskvota) {
                tcel = "✓";
                fed = "";
            } else {
                tcel = "";
                fed = "✓";
            }
            let rbal = result.RLpoints ? result.RLpoints : "";
            let mbal = result.Mathpoints ? result.Mathpoints : "";
            let fbal = result.PHpoints ? result.PHpoints : "";
            let obal = result.SSpoints ? result.SSpoints : "";
            let hbal = result.HIpoints ? result.HIpoints : "";
            let lbal = result.LIpoints ? result.LIpoints : "";
            let reg;
            let r;
            if (result.RLege == "ЕГЭ") {
                reg = "✓";
                r = "";
            } else if (result.RLege == "Олимпиада") {
                reg = "";
                r = "✓";
            } else {
                reg = "";
                r = "";
            }
            let ieg;
            let m;
            if (result.Mathege == "ЕГЭ") {
                ieg = "✓";
                m = "";
            } else if (result.Mathege == "Олимпиада") {
                ieg = "";
                m = "✓";
            } else {
                ieg = "";
                m = "";
            }
            let feg;
            let ff;
            if (result.PHege == "ЕГЭ") {
                feg = "✓";
                ff = "";
            } else if (result.PHege == "Олимпиада") {
                feg = "";
                ff = "✓";
            } else {
                feg = "";
                ff = "";
            }
            let oeg;
            let ob;
            if (result.SSege == "ЕГЭ") {
                oeg = "✓";
                ob = "";
            } else if (result.SSege == "Олимпиада") {
                oeg = "";
                ob = "✓";
            } else {
                oeg = "";
                ob = "";
            }
            let heg;
            let his;
            if (result.HIege == "ЕГЭ") {
                heg = "✓";
                his = "";
            } else if (result.HIege == "Олимпиада") {
                heg = "";
                his = "✓";
            } else {
                heg = "";
                his = "";
            }
            let leg;
            let lit;
            if (result.LIege == "ЕГЭ") {
                leg = "✓";
                lit = "";
            } else if (result.LIege == "Олимпиада") {
                leg = "";
                lit = "✓";
            } else {
                leg = "";
                lit = "";
            }
            let RLyear = result.RLyear ? result.RLyear : "";
            let Mathyear = result.Mathyear ? result.Mathyear : "";
            let PHyear = result.PHyear ? result.PHyear : "";
            let SSyear = result.SSyear ? result.SSyear : "";
            let HIyear = result.HIyear ? result.HIyear : "";
            let LIyear = result.LIyear ? result.LIyear : "";
            let rte;
            let rtu;
            if (result.RLtest == "ЕГЭ") {
                rte = "✓";
                rtu = "";
            } else if (result.RLtest == "РГРТУ") {
                rte = "";
                rtu = "✓";
            } else {
                rte = "";
                rtu = "";
            }
            let ite;
            let itu;
            if (result.Mathtest == "ЕГЭ") {
                ite = "✓";
                itu = "";
            } else if (result.Mathtest == "РГРТУ") {
                ite = "";
                itu = "✓";
            } else {
                ite = "";
                itu = "";
            }
            let fte;
            let ftu;
            if (result.PHtest == "ЕГЭ") {
                fte = "✓";
                ftu = "";
            } else if (result.PHtest == "РГРТУ") {
                fte = "";
                ftu = "✓";
            } else {
                fte = "";
                ftu = "";
            }
            let ote;
            let otu;
            if (result.SStest == "ЕГЭ") {
                ote = "✓";
                otu = "";
            } else if (result.SStest == "РГРТУ") {
                ote = "";
                otu = "✓";
            } else {
                ote = "";
                otu = "";
            }
            let hte;
            let htu;
            if (result.HItest == "ЕГЭ") {
                hte = "✓";
                htu = "";
            } else if (result.HItest == "РГРТУ") {
                hte = "";
                htu = "✓";
            } else {
                hte = "";
                htu = "";
            }
            let lte;
            let ltu;
            if (result.LItest == "ЕГЭ") {
                lte = "✓";
                ltu = "";
            } else if (result.LItest == "РГРТУ") {
                lte = "";
                ltu = "✓";
            } else {
                lte = "";
                ltu = "";
            }
            let rspec = result.RLisspecialrights ? "✓" : "";
            let mspec = result.Mathisspecialrights ? "✓" : "";
            let fspec = result.PHisspecialrights ? "✓" : "";
            let ospec = result.SSisspecialrights ? "✓" : "";
            let hspec = result.HIisspecialrights ? "✓" : "";
            let lspec = result.LIisspecialrights ? "✓" : "";
            let pictu;
            if (result.DRtest == "РГРТУ") {
                pictu = "✓";
            }  else {
                pictu = "";
            }
            let picspec = result.DRisspecialrights ? "✓" : "";
            let inttu;
            if (result.Inttest == "РГРТУ") {
                inttu = "✓";
            }  else {
                inttu = "";
            }
            let intspec = result.Intisspecialrights ? "✓" : "";
            let listspec = result.extratest ? result.extratest : "";
            let specrig;
            let notspecrig;
            if (result.isspecialrights) {
                specrig = "✓";
                notspecrig = "";
            }  else {
                specrig = "";
                notspecrig = "✓";
            }
            let notint;
            let withint;
            if (result.iswithoustest) {
                notint = "✓";
                withint = "";
            }  else {
                notint = "";
                withint = "✓";
            }
            let docwithright = result.docright ? result.docright : "";
            let achiv1 = result.achiv1 ? result.achiv1 : "";
            let achiv2 = result.achiv2 ? result.achiv2 : "";
            let achiv3 = result.achiv3 ? result.achiv3 : "";
            let needlive;
            let notneedlive;
            if (result.isneedlive) {
                needlive = "✓";
                notneedlive = "";
            }  else {
                needlive = "";
                notneedlive = "✓";
            }
            let havedip;
            let nothavedip;
            if (result.isdiploma) {
                havedip = "✓";
                nothavedip = "";
            }  else {
                havedip = "";
                nothavedip = "✓";
            }
            user.getfacl(result.profile1, function(res1) {
                let prof1 = res1.nameP;
                let facl1 = res1.nameF.toLowerCase().replace("факультет", "");
                user.getfacl(result.profile2, function(res2) {
                    let prof2 = res2 ? res2.nameP : res2;
                    let facl2 = res2 ? res2.nameF.toLowerCase().replace("факультет", "") : res2;
                    user.getfacl(result.profile3, function(res3) {
                        let prof3 = res3 ? res3.nameP : res3;
                        let facl3 = res3 ? res3.nameF.toLowerCase().replace("факультет", "") : res3;
                        doc.setData({
                            surname: thisuser.surname,
                            name: thisuser.name,
                            patronym: thisuser.patronym,
                            dateofbirth: data,
                            birthplace: birthplace,
                            citizenship: result.citizenship,
                            seria: result.seria,
                            number: result.number,
                            whogives: whowhengives,
                            fulladress: fulladress,
                            phone: result.phone,
                            email: result.email,
                            yearfin: result.yeareducate,
                            finishschool: finishschool,
                            attest: attest,
                            diploma: diploma,
                            attestser: attestser,
                            attestnum: attestnum,
                            laneng: laneng,
                            langem: langem,
                            lanfr: lanfr,
                            lanan: lanan,
                            o: o,
                            ozo: ozo,
                            zo: zo,
                            tcel: tcel,
                            fed: fed,
                            rbal: rbal,
                            mbal: mbal,
                            fbal: fbal,
                            obal: obal,
                            hbal: hbal,
                            lbal: lbal,
                            reg: reg,
                            ieg: ieg,
                            feg: feg,
                            oeg: oeg,
                            heg: heg,
                            leg: leg,
                            r: r,
                            m: m,
                            ff: ff,
                            ob: ob,
                            his: his,
                            lit: lit,
                            RLyear: RLyear,
                            Mathyear: Mathyear,
                            PHyear: PHyear,
                            SSyear: SSyear,
                            HIyear: HIyear,
                            LIyear: LIyear,
                            rte: rte,
                            rtu: rtu,
                            ite: ite,	
                            itu: itu, 
                            fte: fte,
                            ftu: ftu,     
                            ote: ote,
                            otu: otu,
                            hte: hte,
                            htu: htu,
                            lte: lte,
                            ltu: ltu,
                            rspec: rspec,
                            mspec: mspec,
                            fspec: fspec,
                            ospec: ospec,
                            hspec: hspec,
                            lspec: lspec,
                            pictu: pictu,
                            picspec: picspec,
                            inttu: inttu,
                            intspec: intspec,
                            listspec: listspec,
                            specrig: specrig,
                            notspecrig: notspecrig,
                            notint: notint,
                            withint: withint,
                            docwithright: docwithright,
                            achiv1: achiv1,
                            achiv2: achiv2,
                            achiv3: achiv3,
                            needlive: needlive,
                            notneedlive: notneedlive,
                            havedip: havedip,
                            nothavedip: nothavedip,
                            prof1: prof1,
                            facl1: facl1,
                            prof2: prof2,
                            facl2: facl2,
                            prof3: prof3,
                            facl3: facl3
                        }); 
                        try {
                            // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
                            doc.render()
                        }
                        catch (error) {
                            // Catch rendering errors (errors relating to the rendering of the template : angularParser throws an error)
                            errorHandler(error);
                        }
                        var buf = doc.getZip().generate({type: 'nodebuffer'});
                        let bodyCopy = {};
                        // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
                        fs.mkdir(path.join(__dirname, '../files/user'+thisuser.id), (err) => { 
                            if (err) { 
                                bodyCopy.application = false;
                            } 
                            fs.writeFileSync(path.resolve(__dirname, '../files/user'+thisuser.id+'/application'+thisuser.id+'.docx'), buf);
                            bodyCopy.application = true;
                        }); 
                        user.insertdata(thisuser.id, bodyCopy, function(lastId) {
                            if(lastId) {
                                res.redirect("/docsload");      
                            }else {
                                res.send('error');
                            }
                        });
                    });
                });
            });
            
        });        
    } else {
        res.redirect("/login");
    }
});


const storageConfig = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, "files");
    },
    filename: (req, file, cb) =>{
        let ind = file.originalname.lastIndexOf(".");
        console.log(file.originalname)
        cb(null, "user"+ req.session.user.id +"/"+file.fieldname+"."+file.originalname.substr(ind + 1,file.originalname.length-ind-1));
    }
});
router.use(multer({storage:storageConfig}).fields([
    { name: 'docPassport', maxCount: 1 },
    { name: 'docEducation', maxCount: 1 },
    { name: 'docPhoto', maxCount: 1 },
    { name: 'docRirht', maxCount: 1 },
    { name: 'docCel', maxCount: 1 },
    { name: 'docMed', maxCount: 1 }
  ]));

router.post("/upload", function (req, res, next) {
    for (let docc in req.files) {
        let filedata = req.files[docc];
        if(!filedata)
            res.send("Ошибка при загрузке файла");               
    }
    res.send("Файл загружен");
});

router.get('/conclists', (req, res, next) => {
    res.render("conclists", {session:req.session.user, info:[]});
});

router.get('/setpoints', (req, res, next) => {
    user.profileGet(function(result) {
        res.render("setpoints", {session:req.session.user, users:result});
    });
});

module.exports = router;