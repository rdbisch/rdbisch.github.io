target=/var/www/initial_quote
rm -fr $target./*
cp * $target
cp -r images $target
chmod -R go+r $target
