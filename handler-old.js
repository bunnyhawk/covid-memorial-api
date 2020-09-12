'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const S3 = require('aws-sdk/clients/s3');
const csv = require('csvtojson');
const sls = require('serverless-http');
const nodemailer = require("nodemailer");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/names', async (req, res, next) => {
  const s3 = new S3({
    region: 'us-west-2'
  });

  const s3SelectQuery = (query) => {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: 'covid-names-memorial',
        Key: 'nyt.csv',
        ExpressionType: 'SQL',
        Expression: query,
        InputSerialization: {
          CSV: {
            FileHeaderInfo: 'USE',
            FieldDelimiter: ',',
            AllowQuotedRecordDelimiter: true
          }
        },
        OutputSerialization: {
          CSV: {
            FieldDelimiter: ',',
            QuoteFields: 'ALWAYS'
          }
        }
      };

      let resultData = '';
      s3.selectObjectContent(params, (err, data) => {
        if(!err){
          data.Payload.on('data', (data) => {
            if (data.Records && data.Records.Payload) {
              let str = Buffer.from(data.Records.Payload);
              resultData += str;
            }            
          });
          data.Payload.on('end', (data) => {
              resolve(resultData);
          })
        } else {
          reject(err);
        }
      });
    });
  };


  s3SelectQuery(
    `SELECT * from S3Object LIMIT ${req.query.records || '100'}`
  ).then( data => {
    const result = 'name,age,location,date,about,source\n' + data;

    return csv({ trim: true }).fromString(result).then(result => {
      res.status(200).send(result);
    });
    
  })
});

app.post('/send-mail', async (req, res, next) => {

  function main() {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "positronicshell@gmail.com",
        pass: process.env.MAIL_ACCESS,
      },
    });

    const message = {
      from: '"Robert" <positronicshell@gmail.com>', // sender address
      to: "positronicshell@gmail.com", // list of receivers
      subject: "Honor A Loved One: Submission",
      text: "A submission for consideration on the COVID Memorial", // plain text body
      html: `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Honor A Loved One: Submission</h1>
          <p>THE DECEASED</p>
          <ul>
            <li>First Name: ${req.body.firstName}</li>
            <li>Last Name: ${req.body.lastName}</li>
            <li>Age: ${req.body.age}</li>
            <li>Location: ${req.body.location}</li>
            <li>What were they like?: ${req.body.about}</li>
          </ul>
          <p>SUBMITTER</p>
          <ul>
            <li>Name: ${req.body.submitName}</li>
            <li>Relation: ${req.body.submitRelation}</li>
            <li>Email: ${req.body.email}</li>
          </ul>
        </body>
      </html>`
    };

    transporter.sendMail(message, function(err, info) {
      if (err) {
        console.log(err);
      } else {
        res.status(200).send("Submit is a success");
      }
    });
  }

  main()
  
});

module.exports.covidApi = sls(app);