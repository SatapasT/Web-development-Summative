const express = require('express');
const app = express();
const fs = require('fs');

app.use(express.static('client'));
app.use((request, response, next) => {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.json());
const goatDataPath = 'data/goat_data.json';
const threadDataPath = 'data/thread_data.json';
const userDataPath = 'data/user_data.json';
const imageDataPath = 'data/image_data.json';
const itemColourDict = { 0: "bg-light-subtle", 1: "bg-dark-subtle"};
const proConColourDict = { 1: "bg-success-subtle", 2: "bg-danger-subtle"};

let goatData, threadData, userData, imageData;

try {
    goatData = JSON.parse(fs.readFileSync(goatDataPath));
    threadData = JSON.parse(fs.readFileSync(threadDataPath));
    userData = JSON.parse(fs.readFileSync(userDataPath));
    imageData = JSON.parse(fs.readFileSync(imageDataPath));
} catch (error) {
    console.error('Error loading data files: ', error.message);
}

app.get('/goatData/:species/:value', (request, response) => {
    try {
        const species = request.params.species;
        const queryType = request.params.value;

        const goatEntry = goatData.find(entry => entry.species.includes(species));
        const goatImg = imageData.find(entry => entry.species.includes(species));
        const commentEntry = threadData.filter(entry => entry.species.includes(species));

        if (!goatEntry || !goatImg || !commentEntry) {
            response.send('Error fetching data');
            return; 
        }

        let list = [];
        const stringFind = ["Pros", "Cons"];
        let headerPosition = 0;

        switch (queryType) {
            case 'title':
                response.send(`<strong> > ${goatEntry["name"].toString()} < </strong>`);
                break;

            case 'pro-con':
                for (let i = 0; i < goatEntry[queryType].length; i++) {
                    let entry = goatEntry[queryType][i];
                    if (entry.includes(stringFind[headerPosition])) {
                        headerPosition += 1;
                        list.push(`<div class="row"><div class="col text-start ${proConColourDict[headerPosition]} border-bottom"><h2>${entry}</h2></div></div>`);
                        continue;
                    }
                    list.push(`<div class="row"><div class="col text-start ${proConColourDict[headerPosition]}">${entry}</div></div>`);
                }
                response.send(list.join(''));
                break;

            case 'biology':
            case 'history':
            case 'faq':
                for (let i = 0; i < goatEntry[queryType].length; i++) {
                    let entry = goatEntry[queryType][i];
                    list.push(`<div class="row"><div class="col text-start fs-6 ${itemColourDict[i % 2]}">${entry}</div></div>`);
                }
                response.send(list.join(''));
                break;
            
            case 'image':
                list.push(`
                <div id="carouselItem" class="carousel slide">
                <div class="carousel-inner">
                `);
    
                for (let i = 0; i < goatImg["image"].length; i++) {
                    let activeClass = i;
                    if (i === 0) {
                        activeClass = ` active`
                    } else {
                        activeClass = ``
                    }
                    list.push(`
                    <div class="carousel-item${activeClass}">);
                    <img id="carousel-img"src="assets/images/${species}/${goatImg.image[i]}.jpg" class="d-block w-100" alt="${species} image ${goatImg.image[i]}" />
                    </div>
                    `);
                }
                list.push(`
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselItem" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselItem" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
                </button>
                </div>
                `);
                response.send(list.join(''));
                break;

            case 'formInfo':
                response.send(`<p class="lead fst-italic fs-4 text-end">Viewing <b>${goatEntry["name"].toString()}</b> form</p>`);
                break;
            
            case 'commentThread':
                if (commentEntry.length === 0) {
                    list.push(`
                    <div class="row mt-2 mb-2 border border-dark p-3 ${itemColourDict[0]}">
                    <div class="col">
                    <div class="text-center"><strong>No one commented yet, be the first to do so!</div>
                    </div></div>
                    `);
                    
                } else {
                    for (let i = 0; i < commentEntry.length; i++) {
                        list.push(`
                        <div class="row mt-2 mb-2 border border-dark p-3 ${itemColourDict[i % 2]}">
                        <div class="col-4 border-end border-dark p-3">
                        <label for="name_${i}" class="form-label">${commentEntry[i]["date"]} at ${commentEntry[i]["time"]}</label>
                        <div class="text-center" id="name_${i}">From : ${commentEntry[i]["name"]}</div>
                        </div>
                        <div class="col-8 d-flex align-items-center justify-content-center">
                        <div class="text-center">${commentEntry[i]["comment"]}</div>
                        </div></div>`);
                    }
                }
                response.send(list.join(''));
                break;

            default:
                response.send('Invalid query type');
                break;
            
        }
    } catch (error) {
        response.status(500).send('Internal server error');
        console.error(error.message);
    }
});

app.post('/:currentSpecies/commentData', (request, response) => {
    try{
        let commentData = request.body;
        console.log(commentData);
        threadData.push(commentData);
        fs.writeFileSync(threadDataPath, JSON.stringify(threadData));
        response.send("Successfully posted the data");
    } catch (error) {
        response.status(500).send('Internal server error');
        console.error(error.message);
    }
});

app.post('/post/:value', (request, response) => {
    try {
        const data =  request.body;
        const queryType = request.params.value;

        switch (queryType) {
            case 'commentData':
                console.log(data);
                threadData.push(data);
                fs.writeFileSync(threadDataPath, JSON.stringify(threadData));
                response.send("Successfully posted the data");
                break;
            
            case 'signupData': 
                const nameEntry = userData.find(entry => entry.username === data.username);
                if (nameEntry) {
                    response.send("usernameTaken");
                    break; //
                }
                userData.push(data);
                fs.writeFileSync(userDataPath, JSON.stringify(userData));
                response.send("Successfully posted the data");
                break; 
            
            case 'loginStatus':
                const usernameEntry = data.username
                const passwordEntry = data.password
                const usernameMatching = userData.find(entry => entry.username === usernameEntry);
        if (usernameMatching["password"] === passwordEntry) {
            response.send(usernameEntry);
        } else {
            response.send("invalidLogin");
        }
        break;
        }
    } catch (error) {
        response.status(500).send('Internal server error');
        console.error(error.message);
    }
});


const server = app.listen(8080, () => {
    console.log(`Server is running on port ${server.address().port}`);
});
