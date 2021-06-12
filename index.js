const fs = require('fs');
const _ = require('lodash');

const DATA_NOT_FOUND = "_";
let templateJsonbj= JSON.parse(fs.readFileSync('templates/template.json'));
// let titlesData = JSON.parse(fs.readFileSync('sources/titles.json'));
let seasonsData= JSON.parse(fs.readFileSync('sources/seasons.json'));
let seriesData= JSON.parse(fs.readFileSync('sources/series.json'));
// let external_ids= JSON.parse(fs.readFileSync('sources/external_ids.json'));
 
function createNewTemplate(refTemplate, arrName, index) {
  let string = JSON.stringify(refTemplate);
  let regEx = new RegExp(`${arrName}\\[index\\].`, 'gm');
  // console.log("regEx", regEx, "index: ", index);
  string = string.replace(regEx, `${arrName}[${index}].`);
  return JSON.parse(string);
}
function createObj(templateObj,seriesInfo) {

  let resultObj = {};

  for (let key in templateObj) {
    if (typeof templateObj[key] === "object" && !Array.isArray(templateObj[key])) {
      resultObj[key] = {
        ...createObj(templateObj[key], seriesInfo)
      };
    } else if (Array.isArray(templateObj[key])) {


      // key -> serice
       // Key -> movies
      if(key === 'seasons') {
        resultObj[key] = [];
        seriesInfo['seasons'].forEach((obj, i) => {
          let newTemplate = createNewTemplate(templateObj[key][0], key, i);
          // console.log("#newTemplate: ", newTemplate);
          let res = createObj(newTemplate, seriesInfo)
          // console.log("res =>", res);
          resultObj[key].push(res)
        })
        return resultObj;
      }

      if (key === 'episodes') {
        resultObj[key] = [];
        let string = JSON.stringify(templateObj[key]);
        let regEx = new RegExp(`seasons\\[\\d+\\].`, 'gm');
        if (string.match(regEx)) {
          let seasonNumber = string.match(regEx)[0].replace(`seasons[`, '').replace('].', '');
          seasonNumber = Number(seasonNumber);
          // console.log("#seasonNumber: ", seasonNumber);
          if (seasonNumber &&
            seriesInfo['seasons'] &&
            seriesInfo['seasons'][seasonNumber] &&
            seriesInfo['seasons'][seasonNumber]['episodes']
          ) {
            seriesInfo['seasons'][seasonNumber]['episodes'].forEach((obj, i) => {
              let newTemplate = createNewTemplate(templateObj[key][0], key, i);
              // console.log("#newTemplate: ", newTemplate);
              let res = createObj(newTemplate, seriesInfo)
              // console.log("res =>", res);
              resultObj[key].push(res);
            });
          }
        }
        return resultObj;
      }
      
      if(typeof templateObj[key][0] === "object"){
        resultObj[key] = [
          createObj(templateObj[key][0], seriesInfo)
        ]; 
      }



    } else if(typeof templateObj[key] === "string"){
      let val = templateObj[key] 
      /**
       * "{{titles|titles.id}}"  => ["title", "title.id"]
       *
       */
      let arr = val.replace(/{/g, "").replace(/}/g, "").split('|');

      // console.log("arr => ", arr)
      if(arr[0] === 'seasons'){
        resultObj[key] = _.get(seriesInfo, arr[1]) || "";
        // console.log(key, " => ", _.get(seriesInfo, arr[1]))
      } else if(arr[0] === 'episodes'){
        //
        resultObj[key] = _.get(seriesInfo, arr[1]) || "";
        // console.log(key, " => ", _.get(seriesInfo, arr[1]));
      } else if(arr[0] === 'series'){ 
        resultObj[key] = _.get(seriesInfo, arr[1]) || "";
        // console.log(key, " => ", _.get(seriesInfo, arr[1]))
      } else {
        resultObj[key] = DATA_NOT_FOUND;
        // resultObj[key] = templateObj[key];
      }
      // console.log (arr[0], " => ", arr[1], " =>", _.get(seriesInfo, arr[1]) || "" )
    } else {
      resultObj[key] = templateObj[key];
    }
    
  }
  // console.log("resultObj => ",resultObj);
  return resultObj;
}
let seriesList = seriesData.series || [];

let finalObj = {}
for(let i in seriesList){
  let seriesInfo = seriesList[i];
  let episodeObj = (seasonsData.season || []).filter(obj => obj.series_id === seriesInfo.id)[0];
  seriesInfo.seasons = seriesInfo.seasons.map((s)=> {
    s.episodes = (episodeObj.titles || []).filter((obj) => obj.season_id === s.id);
    return s;
  });
   finalObj = createObj(templateJsonbj,seriesInfo);
  
}

fs.writeFileSync('out/feedOut.json', JSON.stringify(finalObj,null,4));
