#!/bin/sh -e


sha256sum -s -c fileinfo
vres=$?
if [ $vres -eq 1 ]; then
    echo "RUNME: FileList Check Failed!!!" >> /tmp/upgrade_result
    exit 3
fi

check=`sha256sum fileinfo | awk {'print $1'}`
if [ $check = "7319dbca497ddd5794f89c94e674f7209d37b7c9941293354f56995d98d72b55" ];then
    cp S69hive /etc/rcS.d/
    cp hiveos.html /www/pages/
    cp hiveon.cgi /www/pages/cgi-bin/
    if ! grep "hive" /www/pages/index.html; then
        sed -i 's/<li class="tabmenu-item-system active"><a href="\/index.html">Overview<\/a><\/li>/<li class="tabmenu-item-system active"><a href="\/index.html">Overview<\/a><\/li> <li class="tabmenu-item-hiveon"><a href="\/hiveos.html">Hive OS<\/a><\/li>/g' /www/pages/index.html
    fi
    if [ -s "FARM_HASH" ]; then
        hash=$(cat FARM_HASH | head -1 | tr -dc '[:alnum:]\n\r')
        if [ $(echo $hash | wc -c) -ne 41 ]; then
            echo "Invalid FARM_HASH" >> /tmp/upgrade_result
            exit 3
        else
            cat FARM_HASH | head -1 | tr -dc '[:alnum:]\n\r' > /config/FARM_HASH
        fi
    fi
    nohup /etc/rcS.d/S69hive &
    echo "Hive installed!" >> /tmp/upgrade_result
    exit 3
else
    echo 'Wrong archive'
    exit 3
fi
