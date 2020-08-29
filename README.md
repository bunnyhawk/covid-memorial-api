# COVID-19 Memorial API

### INFO
This is a sister project for the COVID Memorial project. This is used to query an AWS S3 bucket containing a CSV file where the records of the lives affected by COVID are kept.
```
https://github.com/bunnyhawk/covid-memorial
```

### GET
```
https://a6sz7rpoic.execute-api.us-west-2.amazonaws.com/dev/?records=100
```
Records query gives top number of results 


### Deploy
```
sls deploy -v
```
