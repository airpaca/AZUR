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

// Appel des fonctions
loadingScreen();
createMap();
refreshWmsLayer();
document.getElementById('search__input').addEventListener('keyup', searchCityFromGeoApiGouv);

document.getElementById('search__area').addEventListener('submit', (event) => {
    event.preventDefault();
});
/*
 * Cette fonction créé la Map Leaflet et appelle la @function addWmsMap()
 * pour ajouter la carte de concentration lors du chargement de la page
 */
function createMap() {

    let iniZoom = 9;

    let mapLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: '&copy;<a href="http://www.airpaca.org/"> ATMOSUD - 2020 </a>| © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        accessToken: 'pk.eyJ1IjoiZHVkeTgzIiwiYSI6ImNrNW1pbTA1djA4MHIzZGw1NTBjZHh5dW8ifQ.jJ8WpKmBG9WSoc5hWGALag'
    });

    map = L.map('map', {
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

    addWmsMap('multi');
}

/**
 * Cette fonction permet de générer la chaîne de caractères correspondante au layer choisit par l'utilisateur
 * @param {string} polluant 
 * @param {integer} echeance 
 * @return {json} 
 */
function getWmsLayer(polluant) {
    let layer;
    let wmsAdress;
    let server;
    let zone = document.querySelector('.input__radio__area').checked;
    let serverOn = document.querySelector('.input__radio__server').checked;

    let selectPol = document.getElementById('select-polluant-wms');
    let selectEch = document.getElementById('select-echeance-wms');

    let optionPol = selectPol.options[selectPol.selectedIndex].getAttribute('mapvalue');
    let optionEch = selectEch.options[selectEch.selectedIndex].getAttribute('mapvalue');  

    let days = selectEch.options[selectEch.selectedIndex].getAttribute('ech');

    if (serverOn) {
        if (zone) {
            wmsAdress = 'https://geoservices.atmosud.org/geowebcache/service/wmts?';
    
            layer = `paca-${polluant}-${moment().add(days, 'days').format('YYYY-MM-DD')}`;
        } else {
            wmsAdress = 'https://geoservices.atmosud.org/geoserver/azurjourmc/wms?';
    
            layer = `raster_dep98_${optionPol}_${moment().add(days, 'days').format('YYYY_MM_DD')}_${optionEch}`;
        }

        server = 'geoserver';
    } else {
        wmsAdress = "/cgi-bin/mapserv?map=/home/airpaca/airesv5/script/module/www.azur/previurb-j.map";;

        if (zone) 
            layer = `PACA_${optionPol}_${optionEch}`;          
        else 
            layer = `raster_dep98_${optionPol}_${moment().add(days, 'days').format('YYYY_MM_DD')}_${optionEch}`;
        
        server = 'mapserver';
    }

    console.log({
        "server": server,
        "layer": layer,
        "wmsAdress": wmsAdress
    });

    return {
        "server": server,
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
function addWmsMap(polluant) {

    let flag = 0;
 
    let data = getWmsLayer(polluant);

    if(wmsLayer) map.removeLayer(wmsLayer);

    if(data.server == 'geoserver') {
        wmsLayer = L.tileLayer(
            `${data.wmsAdress}layer=azurjour%3A${data.layer}&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng8&TILEMATRIX=EPSG:900913:{z}&TileCol={x}&TileRow={y}`,
            {
                minZoom : 0,
                maxZoom : 18,
                opacity: 0.6,
                attribution : "AtmoSud"
            }
        ).addTo(map);
    } else {
        wmsLayer = L.tileLayer(data.wmsAdress, { 
                layer: data.layer,
                transparent: true,
                opacity: 0.6,
            }
        ).addTo(map) ;
    }
    
    wmsLayer.on('tileerror', () => {

        if(flag == 1) return;
        
        alert('Problème de lors de l\'insertion de la carte de pollution. Veuillez réesayer');

        flag = 1;
    });
}


/**
 * Cette fonction écoute les zones de selection, et lorsque leurs valeurs changent,
 * le layer du Wms est modifié par celui voulu par l'utilisateur.
 * Cette fonction utilise la @function getWmsLayer() qui générera la nouvelle chaîne de caractères correspondant au layer choisit. 
 */
function refreshWmsLayer() {
    document.querySelector('#select-polluant-wms').addEventListener('change', (event) => {   
        addWmsMap(event.target.value);
        document.getElementById('legend__image').src = `./images/legend_${event.target.value}.png`;
    })

    document.querySelector('#select-echeance-wms').addEventListener('change', () => {  
        addWmsMap(document.querySelector('#select-polluant-wms').value);
    })

    document.querySelectorAll('.input__radio__server').forEach(elm => {
        elm.addEventListener('change', () => {   
            addWmsMap(document.querySelector('#select-polluant-wms').value);
        })
    })

    document.querySelectorAll('.input__radio__area').forEach(elm => {
        elm.addEventListener('change', () => {   
            addWmsMap(document.querySelector('#select-polluant-wms').value);
        })
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

    let selectPol = document.getElementById('select-polluant-wms');
    let poll = selectPol.options[selectPol.selectedIndex].getAttribute('mapvalue');

    const URL = `https://apigeoloc.atmosud.org/getpollution?pol=${poll}&lon=${lon}&lat=${lat}&ech=p0`;

    let response = await fetch(URL);

    let jsonData = await response.json();

    let value = jsonData.data.valeur;

    let vLimite;

    switch (poll) {
        case 'ISA':
            vLimite = 100;
            break;

        case 'NO2':
            vLimite = 400;
            break;

        case 'O3':
            vLimite = 360;
            break;

        case 'PM10':
            vLimite = 100;
            break;

        case 'PM25':
            vLimite = 50;
            break;
    }

    let strokeColor;

    let indiceAir;

    let percentValue = value*100/vLimite;

    if (percentValue >= 0 && percentValue < 20) {
        strokeColor = 'très_bon';
        indiceAir = 'Très Bon';
    } else if (percentValue >= 20 && percentValue < 30) {
        strokeColor = 'bon1';
        indiceAir = 'Bon';
    } else if (percentValue >= 30 && percentValue < 40) {
        strokeColor = 'bon2';
        indiceAir = 'Bon';
    } else if (percentValue >= 40 && percentValue < 50) {
        strokeColor = 'bon3';
        indiceAir = 'Bon';
    } else if (percentValue >= 50 && percentValue < 60) {
        strokeColor = 'moyen';
        indiceAir = 'Moyen';
    } else if (percentValue >= 60 && percentValue < 70) {
        strokeColor = 'médiocre1';
        indiceAir = 'Médiocre';
    } else if (percentValue >= 70 && percentValue < 80) {
        strokeColor = 'médiocre2';
        indiceAir = 'Médiocre';
    } else if (percentValue >= 80 && percentValue < 90) {
        strokeColor = 'médiocre3';
        indiceAir = 'Médiocre';
    } else if (percentValue >= 90 && percentValue < 100) {
        strokeColor = 'mauvais';
        indiceAir = 'Mauvais';
    } else if (percentValue >= 100) {
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
             <path class="circle" stroke-dasharray="${percentValue}, 100" d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831" />
             <text x="18" y="20.35" class="percentage">${value}/${vLimite}</text>
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

    if(poll == 'ISA') drawPolluantGraph(lon, lat);
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

    let selectEch = document.getElementById('select-echeance-wms');
    let ech = selectEch.options[selectEch.selectedIndex].getAttribute('ech');

    let values = [];

    if(polluant == 'Multi Polluant' || polluant == 'O3') return;

    let geoJsonPath = `/geojson/coord_STATION_dispo_PACA_${polluant}_${moment().add(ech, 'days').format('DD_MM_YYYY')}`;

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

