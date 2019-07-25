const express = require('express');
const logger = require('../logger');
const cuid = require('cuid');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const db = req.app.get('db');
    BookmarksService.getAllBookmarks(db)
      .then(bookmarks => {
        res.json(bookmarks);
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, description, rating, url } = req.body;
    const newBookmark = { title, description, rating, url };
    const reqFields = ['title', 'url', 'rating'];

    for (let i = 0; i < reqFields.length; i++) {
      if (newBookmark[reqFields[i]] == null) {
        return res.status(400).json({
          error: { message: `Missing '${reqFields[i]}' in request body` }
        });
      }
    }

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
          .json(bookmark);
      })
      .catch(next);
  });

bookmarksRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    console.log('paramsid', req.params.id);
    BookmarksService.getById(req.app.get('db'), req.params.id)
      .then(bookmark => {
        console.log('bookmark', bookmark);
        if (!bookmark) {
          return res.status(404).json({
            error: { message: 'Bookmark doesn\'t exist' }
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json({
      id: res.bookmark.id,
      description: xss(res.bookmark.description),
      title: xss(res.bookmark.title),
      rating: res.bookmark.rating,
      url: xss(res.bookmark.url)
    });
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(req.app.get('db'), req.params.id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarksRouter;
