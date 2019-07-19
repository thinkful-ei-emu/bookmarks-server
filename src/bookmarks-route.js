const express = require('express');
const logger = require('./logger');
const { bookmarks } = require('./store');
const cuid = require('cuid');


const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route('/bookmarks')
  .get((req, res) => {
    res.json(bookmarks);
  })
  .post(bodyParser, (req, res) => {
    console.log(req.body);
    const { title, description, rating, url } = req.body;
    console.log(title, description, rating, url);

    if(!title) {
      logger.error('title is required');
      return res
        .status(400)
        .send('Invalid data');
    }

    if(!url) {
      logger.error('url is required');
      return res
        .status(400)
        .send('Invalid data');
    }

    if(!description) {
      logger.error('description is required');
      return res
        .status(400)
        .send('Invalid data');
    }

    const id = cuid();

    const newBookmark = {
      id,
      title,
      rating,
      description,
      url
    };

    bookmarks.push(newBookmark);

    logger.info(`Bookmark with id ${id} created.`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(newBookmark);
  });

bookmarksRouter
  .route('/bookmarks/:id')
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find(bookmark => bookmark.id == id);

    if(!bookmark) {
      logger.error(`Bookmark with ${id} not found`);
      return res
        .status(404)
        .send('Bookmark not found');
    }

    res.json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Card with id ${id} not found.`);
      return res
        .status(404)
        .send('Not found');
    }

    bookmarks.splice(bookmarkIndex, 1);
    logger.info(`Card with id ${id} deleted.`);

    res
      .status(204)
      .end();

  });

module.exports = bookmarksRouter;
