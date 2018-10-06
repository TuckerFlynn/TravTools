var express = require('express');
var router = express.Router();
// fs = file system
var fs = require('fs');
// website-scraper takes a url and saves the text to the specified directory
var scrape = require('website-scraper');

// controllers to keep this file decluttered
var sql_controller = require('../database/sqlController');
var activity_controller = require('../controllers/activityController');
var travel_controller = require('../controllers/travelController');
var inactive_controller = require('../controllers/inactiveController');

/* 
    GET home page 
*/
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Home'});
});

/* 
    REGIONS INFO
*/
// Get regions overview page
router.get('/regions', sql_controller.regions_overview_get);

// Get regions history search page
router.get('/regions/history', sql_controller.regions_history_get);
router.get('/regions/history/extend', sql_controller.regions_history_extend);

// Get regions activity page
router.get('/regions/activity', activity_controller.population_activity_get);

// Get region alliance control info
router.get('/region/:id/detail', sql_controller.regions_detail_get);

// Get region history to draw graph of control
router.get('/region/:id/graph', sql_controller.regions_graph_get);

// Get specific region information
router.get('/region/:id', sql_controller.region_id_get);

/*
    INACTIVES
*/
router.get('/inactive', inactive_controller.inactive_get);
router.post('/inactive', inactive_controller.inactive_post);

/* 
    TRAVEL SPEED
*/
router.get('/travel', travel_controller.travel_get);
router.post('/travel', travel_controller.travel_post);

router.get('/settings', function(req, res) {
	res.render('settings', { title: 'Settings' });
});

module.exports = router;
