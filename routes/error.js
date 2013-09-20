
/*
 * GET users listing.
 */

exports.all = function(req, res, next){
  console.log('ErrorHandler said:');
  if(!res.route){
    console.log('Routing error');
    res.send(404, 'Something went wrong!');
  }
};