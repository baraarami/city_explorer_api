'use strict';

const express= require('express');
const server=express();
require('dotenv').config();
const pg = require('pg');
const cors=require('cors');
const superagent = require('superagent');

// const client = new pg.Client(process.env.DATABASE_URL);


const PORT= process.env.PORT || 5000;

server.use(cors());
let client;
let DATABASE_URL = process.env.DATABASE_URL;

server.get('/', (req,res)=>{
  res.send('<h1> Welcome To Home Page ♥ </h1>');
});


server.get('/location', LocationHandler);
server.get('/weather', weatherHandler);
server.get('/parks' , parkHandler);
server.get('/get', getLocationData);
server.get('*' , notFound);
client = new pg.Client({
  connectionString: DATABASE_URL,
});



function addLocationData(locationRes) {

  let search = locationRes.search_query;
  let formatted = locationRes.formatted_query;
  let lat = locationRes.latitude;
  let lon = locationRes.longitude;
  let SQL = 'INSERT INTO locationtable (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;';
  let safeValues = [search, formatted, lat, lon];
  client.query(SQL, safeValues);

}

function getLocationData(req, res) {
  let SQL = `SELECT * FROM locationtable;`;
  client.query(SQL)
    .then(result => {
      res.send(result.rows);

    })
    .catch(error => {
      res.send(error);

    });

}




function LocationHandler(req, res) {

  let cityName = req.query.city;

  let SQL = `SELECT * FROM locationtable WHERE search_query=$1;`;
  let safeValues = [cityName];
  client.query(SQL, safeValues)
    .then(data => {
      if (data.rows.length !== 0) {
        console.log(data.rows);

        res.send(data.rows[0]);

      } else {
        let key = process.env.LOCATION_KEY;
        let locURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

        superagent.get(locURL)
          .then(locdata => {
            let locationData = locdata.body;
            let locationRes = new Location(cityName, locationData);
            addLocationData(locationRes);
            res.send(locationRes);

          })
          .catch(error => {

            res.send(error);
          });

      }

    })
    .catch(error => {
      res.send(error);

    });

}
function Location(cityName,data){
  this.search_query=cityName;
  this.formatted_query=data[0].display_name;
  this.latitude=data[0].lat;
  this.longitude=data[0].lon;

}


function weatherHandler(req,res){
  let cityName=req.query.search_query;
  let key=process.env.WEATHER_key;
  let weatherURL= `http://api.weatherbit.io/v2.0/forecast/daily?key=${key}&city=${cityName}&days=5`;

  superagent.get(weatherURL)
    .then(aPIData=>{
      let weatherData= aPIData.body.data;
      let allWeather=weatherData.map((item)=>{
        return new Weather(item);
      });
      res.send(allWeather);
    });
}



function Weather(dataW){
  this.forecast=dataW.weather.description ;
  this.time =convertDate(dataW.datetime);

}


function convertDate(d){
  let date = new Date (d);
  date = date.toDateString();
  return date;
}



function parkHandelr(req,res){


  let cityName=req.query.search_query;
  let key = process.env.PARK_KEY;
  let parkURL = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`;


  superagent.get(parkURL)
    .then(paData=>{

      let parkData=paData.body.data;


      let parkInfo = parkData.map((item)=>{

        return new Park(item);

      });

      res.send(parkInfo);

    })
    .catch(error=>{

      res.send(error);
    });


}
function Park(cityName){
  this.name=cityName.fullName;
  this.address=`${cityName.addresses[0].line1}, ${cityName.addresses[0].city}, ${cityName.addresses[0].stateCode} ${cityName.addresses[0].postalCode}`;
  this.fee='0.00';
  this.description=cityName.description;
  this.url=cityName.url;

}

function notFound(req,res){
  let objError = {
    status: 500,
    responseText: 'Sorry, something went wrong',
  };
  res.status(500).send(objError);
}


client.connect()
  .then(() => {

    server.listen(PORT, () => {
      console.log(`my port is ${PORT}`);

    });

  });