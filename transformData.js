const fs = require('fs');

function findSampleSize (arrayOfObjects, sampleSizeField) {
  return arrayOfObjects.reduce((acc, o) => acc + o[sampleSizeField], 0);
}

function findMedian (arrayOfObjects, valueField, sampleSizeField) {
  const totalSampleSize = findSampleSize(arrayOfObjects, sampleSizeField);
  const midpoint = totalSampleSize / 2;
  arrayOfObjects.sort((a, b) => a[valueField] - b[valueField]);
  let index = 0;
  let itemsPassed = 0;
  while (index < arrayOfObjects.length && itemsPassed < midpoint) {
    itemsPassed += arrayOfObjects[index][sampleSizeField];
    index++;
  }
  if (index < arrayOfObjects.length) {
    return arrayOfObjects[index][valueField];
  } else if ((index - 1) >= 0) {
    return arrayOfObjects[index - 1][valueField];
  } else {
    return 0;
  }
}

function findMedianEarnings (degrees) {
  return findMedian(degrees, 'medianEarnings', 'earningsSampleSize');
}

function findMedianDebt (degrees) {
  return findMedian(degrees, 'medianDebt', 'debtSampleSize');
}

console.log('Loading data')

const allSchoolData = require('./schoolData.json');

console.log('Done loading data')

console.log('Calculating median income and median debt by degree and overall')

const allDegreeData = allSchoolData.reduce((acc, school) => {
  acc.push(...school.degrees);
  return acc;
}, []);

const filteredDegreeData = allDegreeData.filter(degree => {
  return !!degree.cipCode
    && !!degree.earningsSampleSize
    && !!degree.medianEarnings
    && !!degree.debtSampleSize
    && !!degree.medianDebt;
});

const cipCodes = [...new Set(filteredDegreeData.map(degree => degree.cipCode))].sort();

const degreesGroupedByCipCode =
  cipCodes.map(code => filteredDegreeData.filter(degree => degree.cipCode === code));

const medianDataGroupedByCipCode = degreesGroupedByCipCode.map(degrees => {
  return {
    cipCode: degrees[0].cipCode,
    name: degrees[0].name,
    earningsSampleSize: findSampleSize(degrees, 'earningsSampleSize'),
    medianEarnings: findMedianEarnings(degrees),
    debtSampleSize: findSampleSize(degrees, 'debtSampleSize'),
    medianDebt: findMedianDebt(degrees)
  };
});

const results = [
  {
    cipCode: null,
    name: "Overall.",
    medianEarnings: findMedianEarnings(filteredDegreeData),
    medianDebt: findMedianDebt(filteredDegreeData)
  },
  ...medianDataGroupedByCipCode.sort((a, b) => a.earningsSampleSize - b.earningsSampleSize)
];

console.log('Done performing calculations')

console.log('Writing data to file');

fs.writeFile('degreeData.json', JSON.stringify(results, null, 2), (err) => {
  if (err) throw err;

  console.log('Finished writing data to degreeData.json');
});
