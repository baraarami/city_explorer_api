'use strict';

const express= require('express');
const server=express();
require('dotenv').config();
const pg = require('pg');
const cors=require('cors');
const superagent = require('superagent');

const client = new pg.Client(process.env.DATABASE_URL);


const PORT= process.env.PORT || 5000;
server.use(cors());

server.get('/', (req,res)=>{
  res.send('<h1> Welcome To Home Page ♥ </h1>');
});


server.get('/location', LocationHandler);
server.get('/weather', weatherHandler);
server.get('/parks' , parkHandler);
server.get('/movies', moviesHandelr);
server.get('/yelp', yelpHandelr);
server.get('/get', getLocationData);
server.get('*' , notFound);



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



function parkHandler(req,res){

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

function moviesHandelr(req, res) {

  let countryReq = req.query.formatted_query.split(' ');
  let country = countryReq[countryReq.length - 1];

  if (country === 'USA') {
    country = 'United States of America';
  }


  let key = process.env.MOVIE_API_KEY;
  let regionURL = `https://api.themoviedb.org/3/configuration/countries?api_key=${key}`;
  let region;


  superagent.get(regionURL)
    .then(data => {
      let regionData = data.body;
      regionData.forEach((item) => {
        if (item.english_name === country) {
          region = item.iso_3166_1;
          console.log(region);
        }

      });
      let movieURL = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&region=${region}&sort_by=popularity.desc`;
      superagent.get(movieURL)
        .then(data => {
          let moviesData = data.body.results;
          let moviesInfo = moviesData.map((item) => {

            return new Movies(item);
          });

          res.send(moviesInfo);
        });


    })
    .catch(error => {
      res.send(error);
    });

}


function yelpHandelr(req, res) {
  let cityName = req.query.search_query;
  let page = req.query.page;
  let key = process.env.YELP_API_KEY;
  const resultPerPAge = 5;
  const start = ((page - 1) * resultPerPAge + 1);
  let yelpURL = `https://api.yelp.com/v3/businesses/search?location=${cityName}&limit=${resultPerPAge}&offset=${start}`;
  superagent.get(yelpURL)
    .set('Authorization', `Bearer ${key}`)
    .then(data => {

      let yelpData = data.body.businesses;

      let yelpInfo = yelpData.map((item) => {

        return new Yelp(item);
      });

      res.send(yelpInfo);

    })
    .catch(error => {
      res.send(error);
    });




}




function notFound(req,res){
  let objError = {
    status: 500,
    responseText: 'Sorry, something went wrong',
  };
  res.status(500).send(objError);
}


function Movies(moviesData) {

  this.title = moviesData.title;
  this.overview = moviesData.overview;
  this.average_votes = moviesData.vote_average;
  this.total_votes = moviesData.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${moviesData.poster_path}`;
  this.popularity = moviesData.popularity;
  this.released_on = moviesData.release_date;

}

function Yelp(yelpData){
  this.name=yelpData.name;
  this.image_url=yelpData.image_url;
  this.price=yelpData.price;
  this.rating=yelpData.rating;
  this.url=yelpData.url;
}






client.connect()
  .then(() => {

    server.listen(PORT, () => {
      console.log(`my port is ${PORT}`);

    });

  });