"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const Busboy = require("busboy");
const sls = require("serverless-http");
const nodemailer = require("nodemailer");
const { Logger } = require("lambda-logger-node");
const logger = Logger();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "x-www-form-urlencoded, Origin, X-Requested-With, Content-Type, Accept, Authorization, *"
  );
  next();
});

app.post("/send-mail", async (req, res, next) => {
  const result = {
    files: [],
  };

  var busboy = new Busboy({
    headers: {
      ...req.headers,
      "content-type":
        req.headers["Content-Type"] || req.headers["content-type"],
    },
  });

  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    let currentFile = {
      filename,
      encoding,
      contentType: mimetype,
      data: [],
    };

    file.on("data", function (data) {
      currentFile.data.push(data);
    });
    file.on("end", function () {
      currentFile.data = Buffer.concat(currentFile.data);
      result.files.push(currentFile);
    });
  });
  busboy.on("field", function (fieldname, value) {
    try {
      result[fieldname] = JSON.parse(value);
    } catch (err) {
      result[fieldname] = value;
    }
  });
  busboy.on("finish", function () {
    main();
  });

  req.pipe(busboy);

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
      from: '"Mike" <contact@rememberingcovid19.co>', // sender address
      to: "contact@rememberingcovid19.co", // list of receivers
      cc: "positronicshell@gmail.com",
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
            <li>First Name: ${result.firstName}</li>
            <li>Last Name: ${result.lastName}</li>
            <li>Age: ${result.age}</li>
            <li>Location: ${result.location}</li>
            <li>What were they like?: ${result.about}</li>
          </ul>
          <p>SUBMITTER</p>
          <ul>
            <li>Name: ${result.submitName}</li>
            <li>Relation: ${result.submitRelation}</li>
            <li>Email: ${result.email}</li>
          </ul>
        </body>
      </html>`,
      attachments: result.files.map((file, index) => ({
        filename: file.filename,
        content: new Buffer.from(file.data, "binary"),
        contentType: file.contentType,
      })),
    };

    transporter.sendMail(message, function (err, info) {
      if (err) {
        logger.error(err);
      } else {
        res.status(200).send("Submit is a success");
      }
    });
  }
});

module.exports.covidApi = sls(app);
