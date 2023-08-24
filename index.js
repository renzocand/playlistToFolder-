const fs = require('fs');
const path = require('path');
const readline = require('readline');
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Ingresa el nombre del playlist (sin la extensión): ', playlistName => {
    rl.close();

    const fileCandidates = [
        `${playlistName}.m3u`,
        `${playlistName}.m3u8`,
        `${playlistName}.xspf`
    ];

    let chosenFilePath = null;

    for (const candidate of fileCandidates) {
        if (fs.existsSync(candidate)) {
            chosenFilePath = candidate;
            break;
        }
    }


    if (chosenFilePath) {
        const playlistExtension = path.extname(chosenFilePath).toLowerCase();
        const destFolder = path.join('./', path.basename(chosenFilePath, playlistExtension));

        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder);
            console.log(`Carpeta creada: ${destFolder}`);
        }

        if (playlistExtension === '.xspf') {
            processXspf(chosenFilePath, destFolder);
        } else if (playlistExtension === '.m3u') {
            processM3u(chosenFilePath, destFolder);
        } else if(playlistExtension === '.m3u8'){
            processM3u8(chosenFilePath, destFolder)
        }
        else{
            console.error('Extensión no válida. El programa solo admite archivos XSPF, M3U y M3U8.');
        }
    } else {
        console.error('Archivo no encontrado.');
    }
});



function processXspf(xmlFilePath, destFolder) {
    fs.readFile(xmlFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo XML:', err);
            return;
        }

        parser.parseString(data, (parseErr, result) => {
            if (parseErr) {
                console.error('Error al analizar el archivo XML:', parseErr);
                return;
            }

            const trackList = result.playlist.trackList[0].track;
            trackList.forEach(track => {
                const location = track.location[0];
                const title = track.title[0];
                const file_path = location.replace('file:///', '').replace(/%20/g, ' ');

                const sourcePath = path.resolve(__dirname, file_path);
                const extension = path.extname(file_path);
                const destinationPath = path.join(destFolder, `${title}${extension}`);

                fs.copyFile(sourcePath, destinationPath, copyErr => {
                    if (copyErr) {
                        console.error(`Error al copiar '${title}${extension}':`, copyErr);
                    } else {
                        console.log(`Copiado '${title}${extension}' a la carpeta de destino`);
                    }
                });
            });

            console.log('Proceso XSPF completado.');
        });
    });
}


function processM3u(m3uFilePath, destFolder) {
    const lines = fs.readFileSync(m3uFilePath, 'utf8').split('\n');

    // Aquí debes implementar la lógica para detectar el formato del archivo M3U
    // y llamar a la función de procesamiento correspondiente
    // Por ejemplo:
    if (lines.some(line => line.startsWith('#EXTVDJ:'))) {
        processVirtualDjM3u(m3uFilePath, destFolder);
    } else if (lines.some(line => line.startsWith('#EXTINF:'))) {
        processAimpM3u(m3uFilePath, destFolder);
    } else {
        console.error('Formato de archivo M3U no reconocido.');
    }
}

function processAimpM3u(m3uFilePath, destFolder) {

    fs.readFile(m3uFilePath, 'latin1', (err, data) => {
        if (err) {
            console.error('Error leyendo el archivo M3U:', err);
            return;
        }

        const lines = data.split('\n');
        const trackList = [];
        let currentTrack = null;

        lines.forEach(line => {
            line = line.trim(); // Remove leading and trailing whitespace
            if (line.startsWith('#EXTINF:')) {
                currentTrack = {
                    duration: line.match(/^#EXTINF:(\d+),/)[1],
                };
            } else if (currentTrack && line !== '') {
                currentTrack.location = line;
                trackList.push(currentTrack);
                currentTrack = null;
            }

        });

        if(trackList.length == 0 ){
            console.log('Ocurrio un error(vacio).');
        }

        console.log(trackList);

        trackList.forEach((track, index) => {
            const location = track.location;
            const title = path.basename(location).replace(path.extname(location), '');
            const sourcePath = path.resolve(__dirname, location);
            const extension = path.extname(location);
            const destinationPath = path.join(destFolder, `${title}${extension}`);

            fs.copyFile(sourcePath, destinationPath, copyErr => {
                if (copyErr) {
                    console.error(`Error copiando '${title}${extension}':`, copyErr);
                } else {
                    console.log(`Copiado '${title}${extension}' a la carpeta de destino`);
                }

                if (index === trackList.length - 1) {
                    console.log('Proceso completado.');
                }
            });
        });
    });
}


function processAimpM3u8(m3uFilePath, destFolder) {

    fs.readFile(m3uFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error leyendo el archivo M3U:', err);
            return;
        }

        const lines = data.split('\n');
        const trackList = [];
        let currentTrack = null;

        lines.forEach(line => {
            line = line.trim(); // Remove leading and trailing whitespace
            if (line.startsWith('#EXTINF:')) {
                currentTrack = {
                    duration: line.match(/^#EXTINF:(\d+),/)[1],
                };
            } else if (currentTrack && line !== '') {
                currentTrack.location = line;
                trackList.push(currentTrack);
                currentTrack = null;
            }

        });

        if(trackList.length == 0 ){
            console.log('Ocurrio un error(vacio).');
        }

        console.log(trackList);

        trackList.forEach((track, index) => {
            const location = track.location;
            const title = path.basename(location).replace(path.extname(location), '');
            const sourcePath = path.resolve(__dirname, location);
            const extension = path.extname(location);
            const destinationPath = path.join(destFolder, `${title}${extension}`);

            fs.copyFile(sourcePath, destinationPath, copyErr => {
                if (copyErr) {
                    console.error(`Error copiando '${title}${extension}':`, copyErr);
                } else {
                    console.log(`Copiado '${title}${extension}' a la carpeta de destino`);
                }

                if (index === trackList.length - 1) {
                    console.log('Proceso completado.');
                }
            });
        });
    });
}



// Función para procesar archivos M3U generados por VirtualDJ
function processVirtualDjM3u(m3uFilePath, destFolder) {
    // Implementa el análisis y procesamiento específico para el formato de VirtualDJ
    console.log("Viortualdj");
    fs.readFile(m3uFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error leyendo el archivo M3U:', err);
            return;
        }

        const lines = data.split('\n');
        const trackList = [];
        let currentTrack = null;

        lines.forEach(line => {
            line = line.trim(); // Remove leading and trailing whitespace
            if (line.startsWith('#EXTVDJ:')) {
                currentTrack = {
                    filesize: line.match(/<filesize>(.*?)<\/filesize>/)[1],
                    artist: line.match(/<artist>(.*?)<\/artist>/)[1],
                    title: line.match(/<title>(.*?)<\/title>/)[1],
                    songlength: line.match(/<songlength>(.*?)<\/songlength>/)[1]
                };
            } else if (currentTrack && line !== '') {
                currentTrack.location = line;
                trackList.push(currentTrack);
                currentTrack = null;
            }
        });

        if(trackList.length == 0 ){
            console.log('Ocurrio un error(vacio).');
        }

        trackList.forEach((track, index) => {
            const location = track.location;
            const title = `${track.artist} - ${track.title}`;
            const sourcePath = path.resolve(__dirname, location);
            const extension = path.extname(location);
            const destinationPath = path.join(destFolder, `${title}${extension}`);

            fs.copyFile(sourcePath, destinationPath, copyErr => {
                if (copyErr) {
                    console.error(`Error copiando '${title}${extension}':`, copyErr);
                } else {
                    console.log(`Copiado '${title}${extension}' a la carpeta de destino`);
                }

                if (index === trackList.length - 1) {
                    console.log('Proceso completado.');
                }
            });
        });
    });
}



// Función para procesar archivos M3U8
function processM3u8(m3u8FilePath, destFolder) {
    const lines = fs.readFileSync(m3u8FilePath, 'utf8').split('\n');

   if (lines.some(line => line.startsWith('#EXTINF:'))) {
        processAimpM3u8(m3u8FilePath, destFolder);
    } else {
        console.error('Formato de archivo M3U no reconocido.');
    }
}