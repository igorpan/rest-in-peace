# R.IP. - REST. IN PEACE.

An extensible and simple library for managing REST resources in JavaScript.

## Examples

    var resource = require('rest-in-peace');
    
    var ArticleModel = resource({
    
       url: '/articles' 
    
    });

### Get list of Resources

    // GET '/articles'
    ArticleModel.query().then(function (articles) {
    
        // Do something with articles, for example:
        articles.forEach(function (article) {
            article.views += 1;
            // PATCH '/articles' { name: 'Article name', views: 15 }
            article.$save();
        });
        
    });

### Get single Resource

    // GET '/articles/123'
    ArticleModel.get(123).then(function (article) {
    
        // Do something with an article
        article.name = 'Some new name';
        article.$save();
    
    });

### Creating a new Resource

    var article = new ArticleModel();
    article.name = 'Article name';
    article.views = 0;
    
    // POST '/articles' { name: 'Article name', views: 0 }
    article.$save();

### Updating an existing Resource

    ArticleModel.get(1234).then(function (article) {
        article.name = 'Omg, an update!';
        // PATCH '/articles/1234' { name: 'Omg, an update!', views: 536 }
        article.$save();
    });

### Deleting an existing Resource

    ArticleModel.get(1234).then(function (article) {
        // DELETE '/articles/1234'
        article.$delete();
    });