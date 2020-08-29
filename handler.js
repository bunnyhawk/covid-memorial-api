'use strict';

const express = require('express');
const app = express();
const S3 = require('aws-sdk/clients/s3');
const csv = require('csvtojson');
const sls = require('serverless-http');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/', async (req, res, next) => {
  if (req.query) {
    console.log(req.query);
  }
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

module.exports.readCsv = sls(app);