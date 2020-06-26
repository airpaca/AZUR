/**
 * @author AtmoSud
 * @description Ce fichier contient toutes les fonctions qui animent la carte Azur Leaflet
 * 
 * @package Moment.js (librairie pour manipuler les dates)
 */

// Initilisation variables
let map;
let wmsLayer; 
let markersLayer;
let chart;
const Leaflet = L;

// Appel des fonctions
loadingScreen();
createMap();
refreshWmsLayer();
document.getElementById('search__input').addEventListener('keyup', searchCityFromGeoApiGouv);
/*
 * Cette fonction créé la Map Leaflet et appelle la @function addWmsMap()
 * pour ajouter la carte de concentration lors du chargement de la page
 */
function createMap() {

    let iniZoom = 9;

    let mapLayer = Leaflet.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: '&copy;<a href="http://www.airpaca.org/"> ATMOSUD - 2020 </a>| © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        accessToken: 'pk.eyJ1IjoiZHVkeTgzIiwiYSI6ImNrNW1pbTA1djA4MHIzZGw1NTBjZHh5dW8ifQ.jJ8WpKmBG9WSoc5hWGALag'
    });

    map = Leaflet.map('map', {
        layers: [mapLayer],
        fullscreenControl: true,
    });

    map.on('click', (e) => {
        getDataFromApiGeoloc(e.latlng.lng, e.latlng.lat);
    });

    document.body.addEventListener('click', () => {
        if(!document.getElementById('search__results').classList.contains('hidden')) {
            document.getElementById('search__results').classList.add('hidden');
            document.getElementById('search__input').value = "";
        }
    })

    if(window.innerWidth >= 768 && window.innerWidth < 1200) iniZoom -= 1;

    if(window.innerWidth < 768) iniZoom -= 2;

    map.setView([43.7284, 5.9367], iniZoom);

    if(moment().format('HH') > 10) {
        document.getElementById('container-select-echeance-wms').innerHTML = `
        <select id="select-echeance-wms" class="form-control">
            <option mapvalue="jm1" value="0" ech="1">J-1</option>
            <option mapvalue="jp0" value="1" ech="2" selected>J-0</option>
            <option mapvalue="jp1" value="2" ech="3">J+1</option>
            <option mapvalue="jp2" value="3" ech="4">J+2</option>
        </select>`;
    } else {
        document.getElementById('container-select-echeance-wms').innerHTML = `
        <select id="select-echeance-wms" class="form-control">
            <option mapvalue="jp0" value="1" ech="1">J-1</option>
            <option mapvalue="jp1" value="2" ech="2" selected>J-0</option>
            <option mapvalue="jp2" value="3" ech="3">J+1</option>
        </select>`;
    }

    addWmsMap('multi', 1);
}

/**
 * Cette fonction permet de générer la chaîne de caractères correspondante au layer choisit par l'utilisateur
 * WMTS / TMS
 * @param {string} polluant 
 * @param {integer} echeance 
 * @return {json} 
 */
function getWmsLayer(polluant, echeance) {

    let wmsAdress = 'https://geoservices.atmosud.org/geoserver/azurjour/wms?';

    let layer = `paca-${polluant}-${moment().format('YYYY-MM-DD')}`;

    return {
        "layer": layer,
        "wmsAdress": wmsAdress
    }
}

function getWmsLayerMap() {

    wmsAdress = "/cgi-bin/mapserv?map=/home/airpaca/airesv5/script/module/www.azur/previurb-j.map";

    let selectPol = document.getElementById('select-polluant-wms');
    let optionPol = selectPol.options[selectPol.selectedIndex].getAttribute('mapvalue');

    let selectEch = document.getElementById('select-echeance-wms');
    let optionEch = selectEch.options[selectEch.selectedIndex].getAttribute('mapvalue');  

    let layer = `PACA_${optionPol}_${optionEch}`;
       
    return {
        "layer": layer,
        "wmsAdress": wmsAdress
    }
}

/**
 * Cette fonction récupère la chaîne de caractères générée par la @function getWmsLayer() ci-dessus.
 * Elle se sert ensuite des fonctionnalités de Leaflet pour ajouter le Wms à la carte.
 * @param {srting} polluant 
 * @param {integer} echeance 
 */
function addWmsMap(polluant, echeance) {
    // !! Enlever flyTO fonction apigeoloc quand zoom
    // prepmap généré a 10h30. si erreur -> géoserveur 
    // afficher menu button en desktop et liste déroulante en mobile.
    // charger python en premier avant 12h
    // a partir de midi -> géoserveur 
    let flag = 0;
    let getHours = moment().format('HH');
    let data;

    if(getHours > 10) {
         data = getWmsLayer(polluant, echeance);
    } else {
         data = getWmsLayerMap();
    } 
        

    wmsLayer = Leaflet.tileLayer.wms(data.wmsAdress, {
        layers: data.layer,
        format: 'image/png',
        transparent: true,
        opacity: 0.6
    }).addTo(map);

    wmsLayer.on('tileerror', () => {

        if(flag == 1) return;
        
        alert('Problème de lors de \'insertion de la carte de pollution. Veuillez réesayer');

        flag = 1;
    })
}


/**
 * Cette fonction écoute les zones de selection, et lorsque leurs valeurs changent,
 * le layer du Wms est modifié par celui voulu par l'utilisateur.
 * Cette fonction utilise la @function getWmsLayer() qui générera la nouvelle chaîne de caractères correspondant au layer choisit. 
 */
function refreshWmsLayer() {
    document.querySelector('#select-polluant-wms').addEventListener('change', (event) => {   
        let data = getWmsLayer(event.target.value, document.querySelector('#select-echeance-wms').value);
        wmsLayer.setParams({ layers: data.layer });
        document.getElementById('legend__image').src = `./images/legend_${event.target.value}.png`;
        
        let polluant = document.getElementById('select-polluant-wms');
        let polluantValue = polluant.options[polluant.selectedIndex].textContent;

        let select = document.getElementById('select-echeance-wms');
        let ech = select.options[select.selectedIndex].getAttribute('ech');

        getStationsGeoJSon(polluantValue, ech);
    })

    document.querySelector('#select-echeance-wms').addEventListener('change', (event) => {   
        let data = getWmsLayer(document.querySelector('#select-polluant-wms').value, event.target.value);
        wmsLayer.setParams({ layers: data.layer });

        let polluant = document.getElementById('select-polluant-wms');
        let polluantValue = polluant.options[polluant.selectedIndex].textContent;

        let select = document.getElementById('select-echeance-wms');
        let ech = select.options[select.selectedIndex].getAttribute('ech');

        getStationsGeoJSon(polluantValue, ech);
    })
}

/**
 * Cette fonction permet d'afficher la valeur de la pollution à l'endroit cliqué.
 * Lorsque le clic est effectué, l'api géoloc renvoie une valeur en fonction des coordonnées de l'endroit ciblé.
 * Ensuite cette valeur est affichée dans une popup 
 * @param {float} lon 
 * @param {float} lat 
 */
async function getDataFromApiGeoloc(lon, lat) {

    const URL = `https://apigeoloc.atmosud.org/getpollution?pol=ISA&lon=${lon}&lat=${lat}&ech=p0`

    let response = await fetch(URL);

    let jsonData = await response.json();

    let value = jsonData.data.valeur;

    let strokeColor;

    let indiceAir;

    if (value >= 0 && value < 20) {
        strokeColor = 'très_bon';
        indiceAir = 'Très Bon';
    } else if (value >= 20 && value < 30) {
        strokeColor = 'bon1';
        indiceAir = 'Bon';
    } else if (value >= 30 && value < 40) {
        strokeColor = 'bon2';
        indiceAir = 'Bon';
    } else if (value >= 40 && value < 50) {
        strokeColor = 'bon3';
        indiceAir = 'Bon';
    } else if (value >= 50 && value < 60) {
        strokeColor = 'moyen';
        indiceAir = 'Moyen';
    } else if (value >= 60 && value < 70) {
        strokeColor = 'médiocre1';
        indiceAir = 'Médiocre';
    } else if (value >= 70 && value < 80) {
        strokeColor = 'médiocre2';
        indiceAir = 'Médiocre';
    } else if (value >= 80 && value < 90) {
        strokeColor = 'médiocre3';
        indiceAir = 'Médiocre';
    } else if (value >= 90 && value < 100) {
        strokeColor = 'mauvais';
        indiceAir = 'Mauvais';
    } else if (value >= 100) {
        strokeColor = 'très_mauvais';
        indiceAir = 'Très Mauvais';
    }

    let templatePopup = `
    <div class="flex-wrapper">
     <div class="single-chart">
         <svg viewBox="0 0 36 36" class="circular-chart ${strokeColor}">
             <path class="circle-bg" d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831" />
             <path class="circle" stroke-dasharray="${value}, 100" d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831" />
             <text x="18" y="20.35" class="percentage">${value}/100</text>
         </svg>
     </div>
     <div id="indice_air_quality">
         <h7>Qualité de l'air</h7><br> 
         <h7>${indiceAir}</h7>
     </div>
    </div>`;

    let marker = new L.CircleMarker([lat, lon], {
        opacity: 0,
        fillColor: 'transparent'
    })
    .bindPopup(templatePopup)
    .addTo(map);

    if(window.innerWidth > 992 && map.getZoom() <= 11) lon += 0.25;

    map.flyTo([lat, lon]);
    marker.openPopup();

    drawPolluantGraph(lon, lat);
}

/**
 * Cette fonction utilise l'api api-adresse.data.gouv pour rechercher sa ville et afficher la concentration via l'api.geoloc
 * @param {e} target
 */
async function searchCityFromGeoApiGouv(e) {

    let resultContainer = document.getElementById('search__results');

    if(e.keyCode == 8) return resultContainer.classList.add('hidden');
 
    if((e.keyCode < 65 || e.keyCode > 90) && (e.keyCode < 97 || e.keyCode > 123) && e.keyCode != 32) return;

    let URL = `https://api-adresse.data.gouv.fr/search/?q=${e.target.value}&type=municipality`;

    let cities = new Array();

    let response = await fetch(URL);

    let data = await response.json();

    for(let idx of data.features) {
        let dpt = idx.properties.context.substring(0, 2);

        if(dpt == 13 || dpt == 83 || dpt == 06 || dpt == 04 || dpt == 84 || dpt == 05) {
            cities.push(idx);
        }
    }

    let div = `<div class="w-100">`;

    if(cities.length > 0) {
        for(let idx in cities) {
            div += `<div class="search__result w-100" onclick="getDataFromApiGeoloc(${cities[idx].geometry.coordinates[0]}, ${cities[idx].geometry.coordinates[1]})">
            ${cities[idx].properties.city} - ${cities[idx].properties.context}
            </div>`;
        }
    } else {
        div += `<div class="search__result w-100">Aucun résultat !</div>`;
    }

    div += `</div>`;

    resultContainer.innerHTML = div;

    resultContainer.classList.remove('hidden');
}

/**
 * Cette fonction permet des tracer une courbe des différents polluants à l'endroit cliqué.
 * @param {float} lon 
 * @param {float} lat 
 */
async function drawPolluantGraph(lon, lat) {

    if(window.innerWidth < 992) return;

    let polluant = [];

    let values = [];

    let limitPoll = [50, 200, 180];

    let mappedValues = [];
    
    for(let poll of ['PM10', 'NO2', 'O3']) {
       
        let URL = `https://apigeoloc.atmosud.org/getpollution?pol=${poll}&lon=${lon}&lat=${lat}&ech=p0`

        let response = await fetch(URL);
    
        let jsonData = await response.json();
    
        polluant.push(poll);
        
        values.push(jsonData.data.valeur)
    }

    values.forEach(value => {
        mappedValues.push(value * 40 / limitPoll[values.indexOf(value)]);
    })

    let ascendantValues = mappedValues.sort((a, b) => a - b);

    if(chart) chart.destroy();
    
    document.getElementById('modal__btn').click();

    chart = new Chart(document.getElementById('canvas__modal').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: polluant,
            datasets: [{
                label: 'Concentration des polluants',
                data: ascendantValues,
                backgroundColor: [
                    'rgba(153, 230, 0, 0.3)',
                    'rgba(255, 255, 0, 0.3)',
                    'rgba(255, 84, 0, 0.3)'
                ],
                borderColor: [
                    'rgba(153, 230, 0, 1)',
                    'rgba(255, 255, 0, 1)',
                    'rgba(255, 84, 0, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            legend: {
                position: 'bottom',
                display: true, 
                labels: {fontSize: 10},                
            },
        }
    });
}

/**
 * 
 */
async function getStationsGeoJSon(polluant, echeance) {

    let values = [];

    if(polluant == 'Multi Polluant' || polluant == 'O3') return;

    let geoJsonPath = `/geojson/coord_STATION_dispo_PACA_${polluant}_${moment().format('DD_MM_YYYY')}`;

    let response = await fetch(geoJsonPath);

    if(markersLayer) map.removeLayer(markersLayer);

    return markersLayer = L.geoJson(await response.json(), {

        pointToLayer: (feature, latlng) => { 

            let circle =  new L.CircleMarker(latlng);

            if(echeance == 1) {
                values.push(feature.properties.dispo_1, feature.properties.conc_1);
            } else if(echeance == 2) {
                values.push(feature.properties.dispo_2, feature.properties.conc_2);
            } else if(echeance == 3) {
                values.push(feature.properties.dispo_3, feature.properties.conc_3);
            } else if(echeance == 4) {
                values.push(feature.properties.dispo_4, feature.properties.conc_4);
            }
                                                                   
            // changement pastille uniqument pm25 : 'obs' => triangle Marker rouge ou bleu / 'esti' => triangle (non définitif)
            // mettre pastille ronde et bleue quand la staitons a servi a créer la carte
            // en rouge si elle a servie et dépasser.
            if(values[0] == false) {
                circle.setStyle({
                    fillColor: '#000000', // noir
                    color: "#FFF", 
                    fillOpacity: 0.5,
                    opacity: 1,
                    weight: 1,
                    radius: 8,
                })
            } else if(values[1] >= 50 && polluant == 'PM10') {
                circle.setStyle({
                    fillColor: '#FF0000', // rouge
                    color: "#FFF", 
                    fillOpacity: 0.5,
                    opacity: 1,
                    weight: 1,
                    radius: 8,
                })
            } else if(values[1] >= 200 && polluant == 'NO2') {
                circle.setStyle({
                    fillColor: '#FF0000', // rouge
                    color: "#FFF", 
                    fillOpacity: 0.5,
                    opacity: 1,
                    weight: 1,
                    radius: 8,
                }) 
            } else if(values[1] >= 25 && polluant == 'PM25') {
                circle.setStyle({
                    fillColor: '#FF0000', // rouge
                    color: "#FFF", 
                    fillOpacity: 0.5,
                    opacity: 1,
                    weight: 1,
                    radius: 8,
                })
            } 

            return circle;
        },
    
        onEachFeature: (feature, layer) => {

            console.log(values)

            layer.bindPopup(`<div>
                <p class="popup_content w100" style="text-align:center">${values[0]} : ${values[1]}</p>
            </div>`);

            values = [];
        } 
    }).addTo(map);
}

/**
 * Cette fonction permet de transformer une date en timestamp.
 * utilisé dans la @function getWmsLayer()
 * @param {date} strDate 
 * @returns {integer}
 */
function toTimestamp(strDate) {
    return (Date.parse(strDate)/1000);
}

/**
 * Cette fonction affiche simplement un écran de chargement tant que la page n'est pas entièrement chargée.
 */
function loadingScreen() {
    const loader = setInterval(() => {
        if(document.readyState == 'complete') {
            clearInterval(loader);
            document.getElementById('loading__container').style.setProperty('display', 'none', 'important');
        }
    }, 100);
}
