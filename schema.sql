DROP TABLE IF EXISTS locationtable ;

CREATE TABLE IF NOT EXISTS locationtable (
    search_query VARCHAR (225),
    formatted_query VARCHAR(225),
    latitude VARCHAR(225),
    longitude VARCHAR(225)
);