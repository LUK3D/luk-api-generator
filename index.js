// get the client
const mysql = require('mysql2');
const path = require('path');
var config = {
  host: 'localhost',
  user: 'root',
  password:null,
  database:'eventus_next',
}
// create the connection to database
const connection = mysql.createConnection(config);

/**Select all columns from database */
function getTables(_callback){
  var tables = [];

    connection.query(
       `
       select    TABLE_NAME  from information_schema.columns
        where table_schema = '${config.database}'
        order by table_name,ordinal_position
       `,
       function(err, results, fields) {

        results.forEach(_tables => {
            !(tables[tables.indexOf(_tables.TABLE_NAME)]) && tables.push(_tables.TABLE_NAME);
        });

           _callback && _callback(tables);
       }
     );
 }


  function getColumn(table, _callback){
     connection.query(
        `
        select  COLUMN_NAME  from information_schema.columns
        where table_schema = '${config.database}' and TABLE_NAME = '${table}'
        order by table_name,ordinal_position
        `,
        function(err, results, fields) {
            _callback && _callback(results.map(x=> { return x.COLUMN_NAME}));
        }
      );
  }


function createFiles(fileType,TABLE_U, TABLE_L, fields, IMPORTS){
  const fs = require('fs');
  fs.mkdir(`${__dirname.split(path.sep).pop().split(path.sep).pop()}/dist/${fileType.toLowerCase()}`, { recursive: true }, (err) => {
    if (err) throw err;

      fs.readFile(`${__dirname}/templates/${fileType.toLowerCase()}.luk`, 'utf8', (err, data) => {

        console.log(err);
        var template = data;

        if(TABLE_U){
          console.log(fileType)
          template = template.split("{TABLE_U}").join(TABLE_U)
        }
        if(TABLE_L){
          console.log(fileType)
          template = template.split("{TABLE_L}").join(TABLE_L);
        }
        if(fields){
          console.log(fileType)
          template = template.split("{FIELDS_VALUES}").join(fields.join("\n\t\t"));
        }
        if(IMPORTS){
          template = template.split("{IMPORTS}").join(IMPORTS.join(`\n\t\t`));
        }
        console.log(__dirname.split(path.sep).pop());
        fs.writeFile(`${__dirname.split(path.sep).pop().split(path.sep).pop()}/dist/${fileType.toLowerCase()}/${TABLE_U||''}${((fileType.toLowerCase()!="api" && fileType.toLowerCase()!="model")?fileType:'')}.php`, template, (err) => {
          if (err) throw err;
          console.log('The file has been saved!');
        });
      });

  });
}

function makeControllerFields(TABLE_U, columns){
  var fields = [];
  columns.forEach(column => {
    if(column !="id"){
      fields.push(`$${TABLE_U}->${column} = $request->${column};`)
    }
  });
  return fields;
}


function makeRouteFields(TABLE_U, TABLE_L){
  return `Route::resource('/${TABLE_L}', ${TABLE_U}Controller::class);`;
}

function makeRouteReferences(TABLE_U){
  return `use App\\Http\\Controllers\\${TABLE_U}Controller;`;
}


function generate(){
  getTables((tables)=>{

    var imports = [];
    var routes = [];

    tables.forEach(table => {
      var TABLE_U = snakeToCamel(table);
      TABLE_U = (TABLE_U[0].toUpperCase() + TABLE_U.substring(1,TABLE_U.length));
      var TABLE_L = table;

      imports.push(makeRouteReferences(TABLE_U))
      routes.push(makeRouteFields(TABLE_U, TABLE_L))

      createFiles("Resource", TABLE_U);

      getColumn(table,(columns)=>{
        //Creating the Controllers
        createFiles("Controller", TABLE_U,TABLE_L, makeControllerFields(TABLE_U, columns));
        createFiles("Model", TABLE_U,TABLE_L, columns.map(x=>{return "'"+x+"',"}));

      })
    });

    createFiles("Route",null,null,routes,imports);

  });
}


// generate();


function snakeToCamel(str){
   const _str = str.toLowerCase().replace(/([-_][a-z])/g, group =>
      group
        .toUpperCase()
        .replace('-', '')
        .replace('_', '')
    );

    return _str;

}


function run(configurations = {host:"localhost", user:'root',password:null, database:null}){

  if(!configurations.database){
     console.error("🙄 The database argument is required") ;
     return;
  }
  config = configurations;
  generate();
}



module.exports = {run};



